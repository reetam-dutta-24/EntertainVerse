import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));
vi.mock("@/lib/services/notification.service", () => ({ notifyFriendRequest: vi.fn(), notifyFriendRequestAccepted: vi.fn() }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const notifications = await import("@/lib/services/notification.service");
const follow = await import("@/lib/services/follow.service");

// ---- In-memory tables behind the Prisma mock -------------------------------------------
type Row = Record<string, unknown>;
interface Follow extends Row {
  followerId: string;
  followingId: string;
  createdAt: number;
}
interface FriendRequest extends Row {
  id: string;
  requesterId: string;
  recipientId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}

const users = [
  { id: "alice", name: "Alice", handle: "alice", avatarColor: "rose", avatarUrl: null },
  { id: "bob", name: "Bob", handle: "bob", avatarColor: "sky", avatarUrl: null },
  { id: "cara", name: "Cara", handle: "cara", avatarColor: "lime", avatarUrl: null },
  { id: "dev", name: "Dev", handle: "dev", avatarColor: "amber", avatarUrl: null },
];
let follows: Follow[];
let requests: FriendRequest[];
let clock: number;

/** Enough of Prisma's `where` for this service: equality, `in`, OR, compound unique keys. */
function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") return (condition as Row[]).some((clause) => matches(row, clause));
    if (key.includes("_") && condition && typeof condition === "object") return matches(row, condition as Row);
    if (condition && typeof condition === "object" && "in" in condition) return (condition.in as unknown[]).includes(row[key]);
    return row[key] === condition;
  });
}

const newestFirst = (rows: Follow[]) => [...rows].sort((a, b) => b.createdAt - a.createdAt);

function friendsWith(a: string, b: string) {
  follows.push({ followerId: a, followingId: b, createdAt: clock++ }, { followerId: b, followingId: a, createdAt: clock++ });
}
function followOneWay(a: string, b: string) {
  follows.push({ followerId: a, followingId: b, createdAt: clock++ });
}
function pendingRequest(requesterId: string, recipientId: string, id = `req-${requesterId}-${recipientId}`) {
  requests.push({ id, requesterId, recipientId, status: "PENDING" });
  return id;
}
const followsBetween = (a: string, b: string) => follows.filter((f) => matches(f, { OR: [{ followerId: a, followingId: b }, { followerId: b, followingId: a }] }));

beforeEach(() => {
  follows = [];
  requests = [];
  clock = 1;

  prisma.user.findUnique.mockImplementation(async ({ where }: { where: Row }) => users.find((user) => matches(user, where)) ?? null);
  prisma.user.findMany.mockImplementation(async ({ where }: { where: Row }) => users.filter((user) => matches(user, where)));

  prisma.userFollow.findUnique.mockImplementation(async ({ where }: { where: Row }) => follows.find((f) => matches(f, where)) ?? null);
  prisma.userFollow.findMany.mockImplementation(async ({ where, take }: { where: Row; take?: number }) =>
    newestFirst(follows.filter((f) => matches(f, where))).slice(0, take),
  );
  prisma.userFollow.count.mockImplementation(async ({ where }: { where: Row }) => follows.filter((f) => matches(f, where)).length);
  prisma.userFollow.upsert.mockImplementation(async ({ where, create }: { where: Row; create: Follow }) => {
    const existing = follows.find((f) => matches(f, where));
    if (existing) return existing;
    const row = { ...create, createdAt: clock++ };
    follows.push(row);
    return row;
  });
  prisma.userFollow.deleteMany.mockImplementation(async ({ where }: { where: Row }) => {
    const before = follows.length;
    follows = follows.filter((f) => !matches(f, where));
    return { count: before - follows.length };
  });

  prisma.friendRequest.findUnique.mockImplementation(async ({ where }: { where: Row }) => {
    const row = requests.find((r) => matches(r, where));
    return row ? { ...row, requester: users.find((user) => user.id === row.requesterId) } : null;
  });
  prisma.friendRequest.findFirst.mockImplementation(async ({ where }: { where: Row }) => requests.find((r) => matches(r, where)) ?? null);
  prisma.friendRequest.update.mockImplementation(async ({ where, data }: { where: Row; data: Row }) =>
    Object.assign(requests.find((r) => matches(r, where))!, data),
  );
  prisma.friendRequest.upsert.mockImplementation(async ({ where, create, update }: { where: Row; create: FriendRequest; update: Row }) => {
    const existing = requests.find((r) => matches(r, where));
    if (existing) return Object.assign(existing, update);
    const row = { ...create, id: `req-${create.requesterId}-${create.recipientId}` };
    requests.push(row);
    return row;
  });
  prisma.friendRequest.deleteMany.mockImplementation(async ({ where }: { where: Row }) => {
    requests = requests.filter((r) => !matches(r, where));
    return { count: 1 };
  });
});

// ---- Tests --------------------------------------------------------------------------------

describe("friendship status", () => {
  it("counts as friends only when both follow each other", async () => {
    followOneWay("alice", "bob");
    expect(await follow.areUsersFriends("alice", "bob")).toBe(false);
    followOneWay("bob", "alice");
    expect(await follow.areUsersFriends("alice", "bob")).toBe(true);
    expect(await follow.areUsersFriends("bob", "alice")).toBe(true);
  });

  it("reports each viewer → target state", async () => {
    friendsWith("alice", "bob");
    pendingRequest("alice", "cara");
    const incoming = pendingRequest("dev", "alice");

    expect(await follow.getViewerFriendStatus("alice", "bob")).toEqual({ status: "friends" });
    expect(await follow.getViewerFriendStatus("alice", "cara")).toEqual({ status: "pending_outgoing" });
    expect(await follow.getViewerFriendStatus("alice", "dev")).toEqual({ status: "pending_incoming", incomingFriendRequestId: incoming });
    expect(await follow.getViewerFriendStatus("cara", "dev")).toEqual({ status: "none" });
  });

  it("is 'none' for yourself and for unknown handles", async () => {
    expect(await follow.getViewerFriendStatus("alice", "alice")).toEqual({ status: "none" });
    expect(await follow.getViewerFriendStatusByHandle("alice", "ghost")).toEqual({ status: "none" });
  });

  it("ignores requests that were already answered", async () => {
    requests.push({ id: "old", requesterId: "alice", recipientId: "bob", status: "REJECTED" });
    expect(await follow.getViewerFriendStatus("alice", "bob")).toEqual({ status: "none" });
  });
});

describe("friend lists and counts", () => {
  beforeEach(() => {
    friendsWith("alice", "bob");
    friendsWith("alice", "cara");
    followOneWay("alice", "dev"); // not followed back
    followOneWay("dev", "bob");
  });

  it("counts only mutual follows", async () => {
    expect(await follow.countMutualFriends("alice")).toBe(2);
    expect(await follow.getFriendCount("alice")).toBe(2);
    expect(await follow.getFollowerCount("alice")).toBe(2);
    expect(await follow.countMutualFriends("dev")).toBe(0);
  });

  it("lists friends, most recent first", async () => {
    expect((await follow.listUserFriends("alice")).map((user) => user.handle)).toEqual(["cara", "bob"]);
  });

  it("limits recent followers", async () => {
    expect((await follow.getRecentFollowers("alice", 1)).map((user) => user.handle)).toEqual(["cara"]);
  });

  it("is empty for someone who follows nobody", async () => {
    expect(await follow.listUserFriends("unknown-user")).toEqual([]);
    expect(await follow.getRecentFollowers("unknown-user")).toEqual([]);
  });
});

describe("toggleUserFollow", () => {
  it("rejects unknown users and following yourself", async () => {
    await expect(follow.toggleUserFollow("alice", "ghost")).rejects.toBeInstanceOf(follow.FollowNotFoundError);
    await expect(follow.toggleUserFollow("alice", "alice")).rejects.toBeInstanceOf(follow.FollowForbiddenError);
    expect(requests).toEqual([]);
  });

  it("sends a friend request (no follow yet) and notifies the recipient", async () => {
    const result = await follow.toggleUserFollow("alice", "bob");

    expect(result).toMatchObject({ friendStatus: "pending_outgoing", following: false, friendCount: 0, handle: "bob" });
    expect(requests).toEqual([expect.objectContaining({ requesterId: "alice", recipientId: "bob", status: "PENDING" })]);
    expect(follows).toEqual([]);
    expect(notifications.notifyFriendRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requesterId: "alice", requesterName: "Alice", recipientId: "bob", recipientHandle: "bob" }),
    );
  });

  it("cancels a pending outgoing request and its notification", async () => {
    const id = pendingRequest("alice", "bob");
    const result = await follow.toggleUserFollow("alice", "bob");

    expect(result.friendStatus).toBe("none");
    expect(requests).toEqual([]);
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({ where: { actionType: "friend_request", actionRefId: id } });
  });

  it("accepts a pending incoming request instead of sending a new one", async () => {
    pendingRequest("bob", "alice");
    const result = await follow.toggleUserFollow("alice", "bob");

    expect(result).toMatchObject({ friendStatus: "friends", handle: "bob" });
    expect(await follow.areUsersFriends("alice", "bob")).toBe(true);
    expect(requests).toHaveLength(1);
    expect(notifications.notifyFriendRequest).not.toHaveBeenCalled();
  });

  it("unfriends in both directions", async () => {
    friendsWith("alice", "bob");
    const result = await follow.toggleUserFollow("alice", "bob");

    expect(result).toMatchObject({ friendStatus: "none", friendCount: 0 });
    expect(followsBetween("alice", "bob")).toEqual([]);
  });

  it("can ask again after being rejected", async () => {
    requests.push({ id: "req-alice-bob", requesterId: "alice", recipientId: "bob", status: "REJECTED" });
    const result = await follow.toggleUserFollow("alice", "bob");

    expect(result.friendStatus).toBe("pending_outgoing");
    expect(requests).toEqual([expect.objectContaining({ id: "req-alice-bob", status: "PENDING" })]);
  });
});

describe("acceptFriendRequest", () => {
  it("makes both users friends, marks the request read and tells the requester", async () => {
    const id = pendingRequest("alice", "bob");
    const result = await follow.acceptFriendRequest(id, "bob");

    expect(result).toEqual({ friendStatus: "friends", friendCount: 1, followerCount: 1, handle: "alice" });
    expect(requests[0]!.status).toBe("ACCEPTED");
    expect(await follow.areUsersFriends("alice", "bob")).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "bob", actionType: "friend_request", actionRefId: id },
      data: { read: true },
    });
    expect(notifications.notifyFriendRequestAccepted).toHaveBeenCalledWith({
      accepterId: "bob",
      accepterName: "Bob",
      accepterHandle: "bob",
      requesterId: "alice",
    });
  });

  it("only lets the recipient accept", async () => {
    const id = pendingRequest("alice", "bob");
    await expect(follow.acceptFriendRequest(id, "alice")).rejects.toBeInstanceOf(follow.FriendRequestForbiddenError);
    await expect(follow.acceptFriendRequest(id, "cara")).rejects.toBeInstanceOf(follow.FriendRequestForbiddenError);
    expect(follows).toEqual([]);
    expect(requests[0]!.status).toBe("PENDING");
  });

  it("rejects missing or already-answered requests", async () => {
    await expect(follow.acceptFriendRequest("nope", "bob")).rejects.toBeInstanceOf(follow.FriendRequestNotFoundError);
    requests.push({ id: "done", requesterId: "alice", recipientId: "bob", status: "REJECTED" });
    await expect(follow.acceptFriendRequest("done", "bob")).rejects.toBeInstanceOf(follow.FriendRequestNotFoundError);
    expect(follows).toEqual([]);
  });

  it("doesn't duplicate follows that already exist", async () => {
    followOneWay("alice", "bob");
    const id = pendingRequest("alice", "bob");
    await follow.acceptFriendRequest(id, "bob");
    expect(followsBetween("alice", "bob")).toHaveLength(2);
  });
});

describe("rejectFriendRequest", () => {
  it("marks the request rejected and its notification read, without following", async () => {
    const id = pendingRequest("alice", "bob");
    expect(await follow.rejectFriendRequest(id, "bob")).toEqual({ friendStatus: "none" });

    expect(requests[0]!.status).toBe("REJECTED");
    expect(follows).toEqual([]);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "bob", actionType: "friend_request", actionRefId: id },
      data: { read: true },
    });
  });

  it("only lets the recipient reject", async () => {
    const id = pendingRequest("alice", "bob");
    await expect(follow.rejectFriendRequest(id, "cara")).rejects.toBeInstanceOf(follow.FriendRequestForbiddenError);
    expect(requests[0]!.status).toBe("PENDING");
  });

  it("can't reject twice", async () => {
    const id = pendingRequest("alice", "bob");
    await follow.rejectFriendRequest(id, "bob");
    await expect(follow.rejectFriendRequest(id, "bob")).rejects.toBeInstanceOf(follow.FriendRequestNotFoundError);
  });
});

it("runs the whole flow: request → accept → unfriend", async () => {
  expect((await follow.toggleUserFollow("alice", "bob")).friendStatus).toBe("pending_outgoing");
  expect(await follow.getViewerFriendStatusByHandle("bob", "alice")).toMatchObject({ status: "pending_incoming" });

  expect((await follow.toggleUserFollow("bob", "alice")).friendStatus).toBe("friends");
  expect(await follow.getFriendCount("alice")).toBe(1);

  expect((await follow.toggleUserFollow("alice", "bob")).friendStatus).toBe("none");
  expect(await follow.getFriendCount("alice")).toBe(0);
  expect(await follow.getFriendCount("bob")).toBe(0);
});
