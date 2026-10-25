import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";
import { dmEditSchema, dmSendSchema } from "@/lib/validators/dm";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));
vi.mock("@/lib/services/follow.service", () => ({ areUsersFriends: vi.fn() }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { areUsersFriends } = await import("@/lib/services/follow.service");
const dm = await import("@/lib/services/dm.service");

// Conversation between alice and bob ("alice" < "bob", so alice is the low participant).
const conversation = { id: "conv-1", participantLowId: "alice", participantHighId: "bob", updatedAt: new Date() };
const person = (id: string) => ({ id, name: id, handle: id, avatarColor: "rose", avatarUrl: null });
const message = (fields: Record<string, unknown> = {}) => ({
  id: "msg-1",
  conversationId: "conv-1",
  senderId: "alice",
  content: "hi",
  warnNonFriend: false,
  editedAt: null,
  deletedAt: null,
  createdAt: new Date(),
  sender: person("alice"),
  ...fields,
});

const friends = (value: boolean) => vi.mocked(areUsersFriends).mockResolvedValue(value);
const circleMates = (value: boolean) => prisma.matchCircle.count.mockResolvedValue(value ? 1 : 0);

beforeEach(() => {
  friends(true);
  circleMates(false);
  prisma.directConversation.findUnique.mockImplementation(async ({ where }: { where: { id?: string } }) => (where.id === "conv-1" ? conversation : null));
  prisma.user.findUnique.mockImplementation(async ({ where }: { where: { handle: string } }) => (where.handle === "ghost" ? null : { id: where.handle }));
  prisma.directMessage.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => message({ ...data, id: "msg-new" }));
});

describe("normalizeParticipantPair", () => {
  it("stores a pair the same way whoever starts the chat", () => {
    expect(dm.normalizeParticipantPair("bob", "alice")).toEqual({ participantLowId: "alice", participantHighId: "bob" });
    expect(dm.normalizeParticipantPair("alice", "bob")).toEqual({ participantLowId: "alice", participantHighId: "bob" });
  });
});

describe("who can message whom", () => {
  it("friends can start a conversation", async () => {
    prisma.directConversation.create.mockResolvedValue(conversation);
    await dm.getOrCreateConversation("bob", "alice");
    expect(prisma.directConversation.create).toHaveBeenCalledWith({ data: { participantLowId: "alice", participantHighId: "bob" } });
  });

  it("reuses an existing conversation", async () => {
    prisma.directConversation.findUnique.mockResolvedValue(conversation);
    expect(await dm.getOrCreateConversation("alice", "bob")).toBe(conversation);
    expect(prisma.directConversation.create).not.toHaveBeenCalled();
  });

  it("AI Match circle-mates can message without being friends", async () => {
    friends(false);
    circleMates(true);
    await dm.getOrCreateConversation("alice", "bob");
    // Same active circle, both accepted.
    expect(prisma.matchCircle.count).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        AND: [{ members: { some: { userId: "alice", status: "ACCEPTED" } } }, { members: { some: { userId: "bob", status: "ACCEPTED" } } }],
      },
    });
  });

  it("strangers can't", async () => {
    friends(false);
    await expect(dm.getOrCreateConversation("alice", "stranger")).rejects.toThrow(/only message friends or people in your AI Match circles/);
    expect(prisma.directConversation.create).not.toHaveBeenCalled();
  });

  it("no one can message themself", async () => {
    await expect(dm.getOrCreateConversation("alice", "alice")).rejects.toThrow(new dm.DmForbiddenError("Cannot message yourself."));
  });
});

describe("listMessagesForConversation", () => {
  it("shows a participant the conversation and marks it read", async () => {
    prisma.directMessage.findMany.mockResolvedValue([message(), message({ id: "msg-2", senderId: "bob", sender: person("bob") })]);
    const messages = await dm.listMessagesForConversation("bob", "conv-1");

    expect(messages.map((row) => [row.id, row.isOwn])).toEqual([
      ["msg-1", false],
      ["msg-2", true],
    ]);
    expect(prisma.directMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { conversationId: "conv-1", deletedAt: null }, orderBy: { createdAt: "asc" } }));
    expect(prisma.directConversationRead.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { conversationId_userId: { conversationId: "conv-1", userId: "bob" } } }));
  });

  it("keeps everyone else out", async () => {
    await expect(dm.listMessagesForConversation("eve", "conv-1")).rejects.toBeInstanceOf(dm.DmForbiddenError);
    expect(prisma.directMessage.findMany).not.toHaveBeenCalled();
  });

  it("closes the conversation once they're no longer friends or circle-mates", async () => {
    friends(false);
    await expect(dm.listMessagesForConversation("alice", "conv-1")).rejects.toBeInstanceOf(dm.DmForbiddenError);
    expect(prisma.directMessage.findMany).not.toHaveBeenCalled();
  });

  it("is not found for an unknown conversation", async () => {
    await expect(dm.listMessagesForConversation("alice", "nope")).rejects.toBeInstanceOf(dm.DmNotFoundError);
  });
});

describe("sendDirectMessage", () => {
  it("sends a trimmed message and bumps the conversation, in one transaction", async () => {
    prisma.directConversation.findUnique.mockResolvedValue(conversation);
    const sent = await dm.sendDirectMessage("alice", "bob", "  hello  ");

    expect(prisma.directMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: { conversationId: "conv-1", senderId: "alice", content: "hello", warnNonFriend: false } }));
    expect(prisma.directConversation.update).toHaveBeenCalledWith({ where: { id: "conv-1" }, data: { updatedAt: expect.any(Date) } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(sent).toMatchObject({ content: "hello", isOwn: true, senderId: "alice" });
  });

  it("refuses unknown users and strangers", async () => {
    await expect(dm.sendDirectMessage("alice", "ghost", "hi")).rejects.toThrow(new dm.DmNotFoundError("User not found."));
    friends(false);
    await expect(dm.sendDirectMessage("alice", "stranger", "hi")).rejects.toBeInstanceOf(dm.DmForbiddenError);
    expect(prisma.directMessage.create).not.toHaveBeenCalled();
  });
});

describe("editing and deleting", () => {
  beforeEach(() => {
    prisma.directMessage.findUnique.mockResolvedValue(message());
    prisma.directMessage.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => message(data));
  });

  it("lets only the sender edit", async () => {
    await expect(dm.editDirectMessage("bob", "msg-1", "changed")).rejects.toBeInstanceOf(dm.DmForbiddenError);
    expect(prisma.directMessage.update).not.toHaveBeenCalled();

    expect(await dm.editDirectMessage("alice", "msg-1", " changed ")).toMatchObject({ content: "changed" });
    expect(prisma.directMessage.update).toHaveBeenCalledWith(expect.objectContaining({ data: { content: "changed", editedAt: expect.any(Date) } }));
  });

  it("lets only the sender delete, and only soft-deletes", async () => {
    await expect(dm.deleteDirectMessage("bob", "msg-1")).rejects.toBeInstanceOf(dm.DmForbiddenError);
    expect(await dm.deleteDirectMessage("alice", "msg-1")).toEqual({ id: "msg-1", conversationId: "conv-1" });
    expect(prisma.directMessage.update).toHaveBeenCalledWith({ where: { id: "msg-1" }, data: { deletedAt: expect.any(Date) } });
    expect(prisma.directMessage.delete).not.toHaveBeenCalled();
  });

  it("treats a deleted message as gone", async () => {
    prisma.directMessage.findUnique.mockResolvedValue(message({ deletedAt: new Date() }));
    await expect(dm.editDirectMessage("alice", "msg-1", "x")).rejects.toThrow("Message not found.");
    await expect(dm.deleteDirectMessage("alice", "msg-1")).rejects.toThrow("Message not found.");
  });
});

describe("read state and unread counts", () => {
  it("only participants can mark a conversation read", async () => {
    await expect(dm.markConversationRead("eve", "conv-1")).rejects.toBeInstanceOf(dm.DmForbiddenError);
    expect(prisma.directConversationRead.upsert).not.toHaveBeenCalled();
  });

  it("counts the other person's messages since you last read, ignoring deleted ones", async () => {
    const lastReadAt = new Date("2026-03-01T10:00:00Z");
    prisma.directConversation.findMany.mockResolvedValue([{ id: "conv-1" }, { id: "conv-2" }, { id: "conv-3" }]);
    prisma.directConversationRead.findMany.mockResolvedValue([{ conversationId: "conv-1", lastReadAt }]);
    prisma.directMessage.count.mockImplementation(async ({ where }: { where: { conversationId: string } }) => ({ "conv-1": 2, "conv-2": 5, "conv-3": 0 })[where.conversationId]);

    expect(await dm.getDmUnreadSummary("bob")).toEqual({ unreadChatCount: 2, totalUnreadMessages: 7 });
    expect(prisma.directMessage.count).toHaveBeenCalledWith({
      where: { conversationId: "conv-1", deletedAt: null, senderId: { not: "bob" }, createdAt: { gt: lastReadAt } },
    });
    // Never opened: everything from the other person is unread.
    expect(prisma.directMessage.count).toHaveBeenCalledWith({ where: { conversationId: "conv-2", deletedAt: null, senderId: { not: "bob" } } });
  });

  it("is zero with no conversations", async () => {
    prisma.directConversation.findMany.mockResolvedValue([]);
    expect(await dm.getDmUnreadSummary("bob")).toEqual({ unreadChatCount: 0, totalUnreadMessages: 0 });
  });

  it("lists your conversations with the other person as the peer", async () => {
    prisma.directConversation.findMany.mockResolvedValue([
      { ...conversation, participantLow: person("alice"), participantHigh: person("bob"), messages: [message()], reads: [] },
    ]);
    prisma.directMessage.count.mockResolvedValue(1);

    const [row] = await dm.listConversationsForUser("bob");
    expect(row).toMatchObject({ id: "conv-1", peer: { id: "alice" }, unreadCount: 1, lastMessage: { content: "hi", senderId: "alice" } });
    expect(prisma.directConversation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: [{ participantLowId: "bob" }, { participantHighId: "bob" }] } }));
  });
});

describe("message validation", () => {
  it("rejects blank and over-long messages", () => {
    expect(dmSendSchema.safeParse({ recipientHandle: "bob", content: "   " }).success).toBe(false);
    expect(dmSendSchema.safeParse({ recipientHandle: "bob", content: "x".repeat(4_001) }).success).toBe(false);
    expect(dmSendSchema.safeParse({ recipientHandle: " ", content: "hi" }).success).toBe(false);
    expect(dmEditSchema.parse({ content: "  hi " })).toEqual({ content: "hi" });
  });
});
