import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));
vi.mock("@/lib/services/notification.service", () => ({ notifyCommunityPost: vi.fn() }));
vi.mock("@/lib/services/like.service", () => ({ getLikedPostIds: vi.fn(async () => new Set()) }));
vi.mock("@/lib/services/follow.service", () => ({ areUsersFriends: vi.fn(), listUserFriends: vi.fn(async () => []) }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { areUsersFriends } = await import("@/lib/services/follow.service");
const { notifyCommunityPost } = await import("@/lib/services/notification.service");
const c = await import("@/lib/services/community.service");
const { CommunityForbiddenError: Forbidden, CommunityNotFoundError: NotFound } = c;

// ---- In-memory tables -------------------------------------------------------------------
type Row = Record<string, unknown>;
type Role = "ADMIN" | "MODERATOR" | "MEMBER";
interface CommunityRow extends Row {
  id: string;
  slug: string;
  visibility: "PUBLIC" | "PRIVATE";
  memberCount: number;
  postCount: number;
  memberLimit: number | null;
  joinCodeLookup: string | null;
  joinCodeHash: string | null;
}
interface MemberRow extends Row {
  id: string;
  userId: string;
  communityId: string;
  role: Role;
}
interface PostRow extends Row {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  kind: string;
}
let communities: CommunityRow[];
let members: MemberRow[];
let posts: PostRow[];
let nextId: number;

/** Relations this service filters through: member/post → community, community → members. */
function related(row: Row, key: string): Row | Row[] | undefined {
  if (key === "community") return communities.find((community) => community.id === row.communityId);
  if (key === "members") return members.filter((member) => member.communityId === row.id);
  return undefined;
}

/** Enough of Prisma's `where` for this service: equality, `in`, OR, `some`, compound keys, relations. */
function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") return (condition as Row[]).some((clause) => matches(row, clause));
    if (condition === null || typeof condition !== "object") return row[key] === condition;
    const cond = condition as Row;
    if ("in" in cond) return (cond.in as unknown[]).includes(row[key]);
    if ("some" in cond) return ((related(row, key) as Row[]) ?? []).some((item) => matches(item, cond.some as Row));
    if (key.includes("_")) return matches(row, cond);
    const target = related(row, key);
    return target !== undefined && !Array.isArray(target) && matches(target, cond);
  });
}

const id = (prefix: string) => `${prefix}-${nextId++}`;
const withCommunity = (member: MemberRow) => ({ ...member, community: related(member, "community") });

function seedCommunity(slug: string, fields: Partial<CommunityRow> = {}) {
  const row: CommunityRow = { id: `c-${slug}`, slug, name: slug, visibility: "PUBLIC", memberCount: 0, postCount: 0, memberLimit: null, joinCodeLookup: null, joinCodeHash: null, ...fields };
  communities.push(row);
  return row;
}
function seedMember(userId: string, slug: string, role: Role = "MEMBER") {
  const community = communities.find((row) => row.slug === slug)!;
  members.push({ id: id("m"), userId, communityId: community.id, role });
  community.memberCount = members.filter((member) => member.communityId === community.id).length;
}
const roleOf = (userId: string, slug: string) => members.find((m) => m.userId === userId && related(m, "community") && (related(m, "community") as Row).slug === slug)?.role;
const community = (slug: string) => communities.find((row) => row.slug === slug)!;

beforeEach(() => {
  communities = [];
  members = [];
  posts = [];
  nextId = 1;

  prisma.community.findUnique.mockImplementation(async ({ where }: { where: Row }) => communities.find((row) => matches(row, where)) ?? null);
  prisma.community.create.mockImplementation(async ({ data }: { data: CommunityRow }) => {
    const row = { ...data, id: id("c"), postCount: 0 };
    communities.push(row);
    return row;
  });
  prisma.community.update.mockImplementation(async ({ where, data }: { where: Row; data: Row }) => Object.assign(communities.find((row) => matches(row, where))!, data));
  prisma.community.delete.mockImplementation(async ({ where }: { where: Row }) => {
    communities = communities.filter((row) => !matches(row, where));
  });

  prisma.communityMember.findFirst.mockImplementation(async ({ where }: { where: Row }) => {
    const row = members.find((member) => matches(member, where));
    return row ? withCommunity(row) : null;
  });
  prisma.communityMember.findUnique.mockImplementation(async ({ where }: { where: Row }) => members.find((member) => matches(member, where)) ?? null);
  prisma.communityMember.findMany.mockImplementation(async ({ where }: { where: Row }) => members.filter((member) => matches(member, where)));
  prisma.communityMember.count.mockImplementation(async ({ where }: { where: Row }) => members.filter((member) => matches(member, where)).length);
  prisma.communityMember.create.mockImplementation(async ({ data }: { data: MemberRow }) => {
    const row = { ...data, id: id("m") };
    members.push(row);
    return row;
  });
  prisma.communityMember.update.mockImplementation(async ({ where, data }: { where: Row; data: Row }) => Object.assign(members.find((member) => matches(member, where))!, data));
  prisma.communityMember.delete.mockImplementation(async ({ where }: { where: Row }) => {
    members = members.filter((member) => !matches(member, where));
  });

  prisma.communityPost.findFirst.mockImplementation(async ({ where }: { where: Row }) => posts.find((post) => matches(post, where)) ?? null);
  prisma.communityPost.create.mockImplementation(async ({ data }: { data: PostRow }) => {
    const row = { ...data, id: id("p") };
    posts.push(row);
    return { ...row, author: { name: "Author" }, community: related(row, "community") };
  });
  prisma.communityPost.update.mockImplementation(async ({ where, data }: { where: Row; data: Row }) => Object.assign(posts.find((post) => matches(post, where))!, data));
  prisma.communityPost.delete.mockImplementation(async ({ where }: { where: Row }) => {
    posts = posts.filter((post) => !matches(post, where));
  });
  prisma.communityPost.count.mockImplementation(async ({ where }: { where: Row }) => posts.filter((post) => matches(post, where)).length);

  // "club": public, with an admin, a moderator and a member.
  seedCommunity("club");
  seedMember("admin", "club", "ADMIN");
  seedMember("mod", "club", "MODERATOR");
  seedMember("member", "club");
});

/** A private community with a real room code, created through the service. */
async function privateRoom(memberLimit = 50) {
  const { joinCode } = await c.createCommunity("owner", { name: "Secret Room", category: "Anime", visibility: "PRIVATE", memberLimit } as never);
  return { slug: "secret-room", code: joinCode! };
}

// ---- Tests --------------------------------------------------------------------------------

describe("createCommunity", () => {
  it("makes the creator its admin", async () => {
    await c.createCommunity("u1", { name: "Mecha Fans", category: "Anime", visibility: "PUBLIC" } as never);
    expect(roleOf("u1", "mecha-fans")).toBe("ADMIN");
    expect(community("mecha-fans")).toMatchObject({ memberCount: 1, joinCodeHash: null, memberLimit: null });
  });

  it("issues a room code for a private community and stores only its hash", async () => {
    const { code } = await privateRoom();
    const row = community("secret-room");
    expect(code).toMatch(/^ROOM-[A-Z2-9]{6}$/);
    expect(row.memberLimit).toBe(50);
    expect(row.joinCodeHash).toBeTruthy();
    expect(JSON.stringify(row)).not.toContain(code);
  });
});

describe("joining", () => {
  it("joins a public community as a member and updates the count", async () => {
    expect(await c.joinCommunity("newbie", "club")).toMatchObject({ joined: true, slug: "club" });
    expect(roleOf("newbie", "club")).toBe("MEMBER");
    expect(community("club").memberCount).toBe(4);
  });

  it("is a no-op for an existing member", async () => {
    expect(await c.joinCommunity("member", "club")).toMatchObject({ joined: false });
    expect(members).toHaveLength(3);
  });

  it("needs a room code for a private community", async () => {
    const { slug } = await privateRoom();
    await expect(c.joinCommunity("newbie", slug)).rejects.toThrow(new Forbidden("This community is private. Use a room code to join."));
  });

  it("joins with the room code, however it's typed", async () => {
    const { slug, code } = await privateRoom();
    await c.joinCommunityByCode("newbie", `  ${code.toLowerCase().replace("-", "- ")} `);
    expect(roleOf("newbie", slug)).toBe("MEMBER");
  });

  it("rejects a wrong or too-short code", async () => {
    await privateRoom();
    await expect(c.joinCommunityByCode("newbie", "ROOM-AAAAAA")).rejects.toThrow(new NotFound("Invalid room code."));
    await expect(c.joinCommunityByCode("newbie", "ab")).rejects.toThrow(new Forbidden("Enter a valid room code."));
  });

  it("verifies the code against its hash, not just the lookup key", async () => {
    const { code } = await privateRoom();
    // The lookup key still matches, but the stored hash is for a different code.
    const { hashJoinCode } = await import("@/lib/community-join-code");
    community("secret-room").joinCodeHash = await hashJoinCode("ROOM-ZZZZZZ");
    await expect(c.joinCommunityByCode("newbie", code)).rejects.toThrow(new NotFound("Invalid room code."));
  });

  it("stops at the member limit", async () => {
    const { code } = await privateRoom(2);
    await c.joinCommunityByCode("second", code);
    await expect(c.joinCommunityByCode("third", code)).rejects.toThrow(new Forbidden("This community has reached its member limit."));
  });

  // assertCommunityHasCapacity runs before the "already a member" check.
  it.todo("re-joining a full community you're already in is a no-op, not an error");
});

describe("leaveCommunity", () => {
  it("removes the membership and updates the count", async () => {
    await c.leaveCommunity("member", "club");
    expect(roleOf("member", "club")).toBeUndefined();
    expect(community("club").memberCount).toBe(2);
  });

  it("errors when you're not a member", async () => {
    await expect(c.leaveCommunity("stranger", "club")).rejects.toThrow(new NotFound("You are not a member."));
  });

  // Nothing stops the only admin leaving, which leaves a community no one can manage.
  it.todo("the last admin can't leave without handing over the community");
});

describe("managing the community", () => {
  it("lets admins and moderators edit details, not members", async () => {
    await expect(c.updateCommunity("member", "club", { name: "Hijacked" } as never)).rejects.toThrow(new NotFound("Community not found."));
    await c.updateCommunity("mod", "club", { name: "Club (mod edit)" } as never);
    await c.updateCommunity("admin", "club", { name: "Club" } as never);
    expect(community("club").name).toBe("Club");
  });

  it("issues a new room code when switching to private, and wipes it when switching back", async () => {
    const { joinCode } = await c.updateCommunity("admin", "club", { visibility: "PRIVATE" } as never);
    expect(joinCode).toMatch(/^ROOM-/);
    expect(community("club")).toMatchObject({ visibility: "PRIVATE", memberLimit: 50 });

    await c.updateCommunity("admin", "club", { visibility: "PUBLIC" } as never);
    expect(community("club")).toMatchObject({ visibility: "PUBLIC", memberLimit: null, joinCodeHash: null, joinCodeLookup: null });
    await expect(c.joinCommunityByCode("newbie", joinCode!)).rejects.toThrow("Invalid room code.");
  });

  // Moderators pass updateCommunity's ADMIN/MODERATOR check for every field, while
  // regenerating the code is admin-only and the code status says only admins canManage.
  it.todo("only admins can change visibility, the room code or the member limit");

  it("lets only admins delete the community", async () => {
    await expect(c.deleteCommunity("mod", "club")).rejects.toBeInstanceOf(NotFound);
    await c.deleteCommunity("admin", "club");
    expect(communities.find((row) => row.slug === "club")).toBeUndefined();
  });

  it("regenerates the room code (admins only); the old code stops working", async () => {
    const { slug, code } = await privateRoom();
    seedMember("room-mod", slug, "MODERATOR");
    await expect(c.regenerateCommunityJoinCode("room-mod", slug)).rejects.toBeInstanceOf(NotFound);

    const { joinCode } = await c.regenerateCommunityJoinCode("owner", slug);
    expect(joinCode).not.toBe(code);
    await expect(c.joinCommunityByCode("newbie", code)).rejects.toThrow("Invalid room code.");
    await c.joinCommunityByCode("newbie", joinCode);
    expect(roleOf("newbie", slug)).toBe("MEMBER");
  });

  it("has no room code to regenerate for a public community", async () => {
    await expect(c.regenerateCommunityJoinCode("admin", "club")).rejects.toThrow(new Forbidden("Room codes are only used for private communities."));
  });

  it("shows the room-code panel to admins and moderators only", async () => {
    expect(await c.getCommunityJoinCodeStatus("member", "club")).toBeNull();
    expect(await c.getCommunityJoinCodeStatus("mod", "club")).toMatchObject({ canManage: false });
    expect(await c.getCommunityJoinCodeStatus("admin", "club")).toMatchObject({ canManage: true, isPrivate: false });
  });
});

describe("members", () => {
  it("lets admins remove members", async () => {
    await expect(c.removeCommunityMember("admin", "club", "member")).resolves.toEqual({ removed: true });
    expect(community("club").memberCount).toBe(2);
  });

  it("doesn't let moderators or members remove anyone", async () => {
    await expect(c.removeCommunityMember("mod", "club", "member")).rejects.toThrow(new Forbidden("Only community admins can do this."));
    await expect(c.removeCommunityMember("member", "club", "mod")).rejects.toBeInstanceOf(Forbidden);
    expect(members).toHaveLength(3);
  });

  it("protects admins and the actor themself", async () => {
    seedMember("admin2", "club", "ADMIN");
    await expect(c.removeCommunityMember("admin", "club", "admin2")).rejects.toThrow("Cannot remove another admin.");
    await expect(c.removeCommunityMember("admin", "club", "admin")).rejects.toThrow("Use leave community to remove yourself.");
  });

  it("lets admins promote and demote, but not touch admins", async () => {
    await c.updateCommunityMemberRole("admin", "club", "member", "MODERATOR");
    expect(roleOf("member", "club")).toBe("MODERATOR");
    await c.updateCommunityMemberRole("admin", "club", "mod", "MEMBER");
    expect(roleOf("mod", "club")).toBe("MEMBER");

    seedMember("admin2", "club", "ADMIN");
    await expect(c.updateCommunityMemberRole("admin", "club", "admin2", "MEMBER")).rejects.toThrow("Cannot change an admin's role.");
    await expect(c.updateCommunityMemberRole("mod", "club", "member", "MODERATOR")).rejects.toBeInstanceOf(Forbidden);
  });

  it("adds only mutual friends, only to private communities", async () => {
    await expect(c.addFriendToCommunity("admin", "club", "friend")).rejects.toThrow("Friend invites are only available for private communities.");

    const { slug } = await privateRoom();
    vi.mocked(areUsersFriends).mockResolvedValue(false);
    await expect(c.addFriendToCommunity("owner", slug, "not-a-friend")).rejects.toThrow("You can only add mutual friends.");
    vi.mocked(areUsersFriends).mockResolvedValue(true);
    await c.addFriendToCommunity("owner", slug, "friend");
    expect(roleOf("friend", slug)).toBe("MEMBER");
  });
});

describe("posts", () => {
  const post = (title = "Hello") => ({ title, content: "Body" });

  it("needs membership to post, and notifies the community", async () => {
    await expect(c.createCommunityPost("stranger", "club", post() as never)).rejects.toThrow(new Forbidden("Join the community first."));
    await c.createCommunityPost("member", "club", post() as never);
    expect(posts).toHaveLength(1);
    expect(community("club").postCount).toBe(1);
    expect(notifyCommunityPost).toHaveBeenCalledWith(expect.objectContaining({ slug: "club" }), expect.objectContaining({ authorId: "member" }));
  });

  it("lets only admins and moderators post announcements", async () => {
    const announcement = { ...post("News"), kind: "ANNOUNCEMENT" } as never;
    await expect(c.createCommunityPost("member", "club", announcement)).rejects.toThrow("Only admins and moderators can post announcements.");
    await c.createCommunityPost("mod", "club", announcement);
    await c.createCommunityPost("admin", "club", announcement);
    expect(posts.map((row) => row.kind)).toEqual(["ANNOUNCEMENT", "ANNOUNCEMENT"]);
  });

  it("lets only the author edit a post — not even an admin", async () => {
    const { id: postId } = await c.createCommunityPost("member", "club", post() as never);
    await expect(c.updateCommunityPost("admin", "club", postId, { title: "Edited by admin" } as never)).rejects.toThrow("Post not found.");
    await c.updateCommunityPost("member", "club", postId, { title: "Edited" } as never);
    expect(posts[0]!.title).toBe("Edited");
  });

  it.each(["member", "mod", "admin"])("lets the %s delete a member's post", async (actor) => {
    const { id: postId } = await c.createCommunityPost("member", "club", post() as never);
    await c.deleteCommunityPost(actor, "club", postId);
    expect(posts).toEqual([]);
    expect(community("club").postCount).toBe(0);
  });

  it("doesn't let other members delete someone's post", async () => {
    seedMember("other", "club");
    const { id: postId } = await c.createCommunityPost("member", "club", post() as never);
    await expect(c.deleteCommunityPost("other", "club", postId)).rejects.toThrow("Post not found.");
    expect(posts).toHaveLength(1);
  });

  it("doesn't let a moderator of another community delete posts here", async () => {
    seedCommunity("other-club");
    seedMember("other-mod", "other-club", "MODERATOR");
    const { id: postId } = await c.createCommunityPost("member", "club", post() as never);
    await expect(c.deleteCommunityPost("other-mod", "club", postId)).rejects.toThrow("Post not found.");
    await expect(c.deleteCommunityPost("other-mod", "other-club", postId)).rejects.toThrow("Post not found.");
    expect(posts).toHaveLength(1);
  });
});
