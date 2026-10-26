import { prisma } from "@/lib/prisma";
import { areUsersFriends } from "@/lib/services/follow.service";
import { formatPostedAt } from "@/lib/format-dates";

/** Members of the same active AI Match circle (both accepted) can message each other. */
async function areCircleMates(userAId: string, userBId: string) {
  const shared = await prisma.matchCircle.count({
    where: {
      status: "ACTIVE",
      AND: [
        { members: { some: { userId: userAId, status: "ACCEPTED" } } },
        { members: { some: { userId: userBId, status: "ACCEPTED" } } },
      ],
    },
  });
  return shared > 0;
}

/** DMs are for friends — and for people in your AI Match circles. (Also decides who may see your online status.) */
export async function canDirectMessage(userAId: string, userBId: string) {
  return (await areUsersFriends(userAId, userBId)) || (await areCircleMates(userAId, userBId));
}

export class DmNotFoundError extends Error {
  constructor(message = "Conversation not found.") {
    super(message);
    this.name = "DmNotFoundError";
  }
}

export class DmForbiddenError extends Error {
  constructor(message = "You cannot access this conversation.") {
    super(message);
    this.name = "DmForbiddenError";
  }
}

export function normalizeParticipantPair(userAId: string, userBId: string) {
  return userAId < userBId
    ? { participantLowId: userAId, participantHighId: userBId }
    : { participantLowId: userBId, participantHighId: userAId };
}

export async function getOrCreateConversation(userAId: string, userBId: string) {
  if (userAId === userBId) throw new DmForbiddenError("Cannot message yourself.");

  const allowed = await canDirectMessage(userAId, userBId);
  if (!allowed) {
    throw new DmForbiddenError(
      "You can only message friends or people in your AI Match circles. Send a friend request first.",
    );
  }

  const pair = normalizeParticipantPair(userAId, userBId);
  const existing = await prisma.directConversation.findUnique({
    where: {
      participantLowId_participantHighId: pair,
    },
  });
  if (existing) return existing;

  return prisma.directConversation.create({ data: pair });
}

export async function listConversationsForUser(userId: string) {
  const rows = await prisma.directConversation.findMany({
    where: {
      OR: [{ participantLowId: userId }, { participantHighId: userId }],
    },
    include: {
      participantLow: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
      participantHigh: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      reads: {
        where: { userId },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return Promise.all(
    rows.map(async (row) => {
      const peer =
        row.participantLowId === userId ? row.participantHigh : row.participantLow;
      const last = row.messages[0];
      const lastReadAt = row.reads[0]?.lastReadAt ?? null;
      const unreadCount = await getUnreadCountForConversation(
        row.id,
        userId,
        lastReadAt,
      );
      return {
        id: row.id,
        peer: {
          id: peer.id,
          name: peer.name,
          handle: peer.handle,
          avatarColor: peer.avatarColor,
          avatarUrl: peer.avatarUrl ?? undefined,
        },
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              senderId: last.senderId,
              warnNonFriend: last.warnNonFriend,
              createdAt: formatPostedAt(last.createdAt),
            }
          : undefined,
        updatedAt: row.updatedAt,
        unreadCount,
      };
    }),
  );
}

export async function listMessagesForConversation(
  userId: string,
  conversationId: string,
  limit = 80,
) {
  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) throw new DmNotFoundError();
  if (
    conversation.participantLowId !== userId &&
    conversation.participantHighId !== userId
  ) {
    throw new DmForbiddenError();
  }

  const peerId =
    conversation.participantLowId === userId
      ? conversation.participantHighId
      : conversation.participantLowId;
  if (!(await canDirectMessage(userId, peerId))) {
    throw new DmForbiddenError(
      "You can only message friends or people in your AI Match circles.",
    );
  }

  const rows = await prisma.directMessage.findMany({
    where: { conversationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
    },
  });

  await markConversationRead(userId, conversationId);

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    sender: {
      id: row.sender.id,
      name: row.sender.name,
      handle: row.sender.handle,
      avatarColor: row.sender.avatarColor,
      avatarUrl: row.sender.avatarUrl ?? undefined,
    },
    content: row.content,
    warnNonFriend: row.warnNonFriend,
    editedAt: row.editedAt ? formatPostedAt(row.editedAt) : undefined,
    createdAt: formatPostedAt(row.createdAt),
    isOwn: row.senderId === userId,
  }));
}

export async function sendDirectMessage(
  senderId: string,
  recipientHandle: string,
  content: string,
) {
  const recipient = await prisma.user.findUnique({
    where: { handle: recipientHandle },
    select: { id: true },
  });
  if (!recipient) throw new DmNotFoundError("User not found.");

  const conversation = await getOrCreateConversation(senderId, recipient.id);

  const message = await prisma.$transaction(async (tx) => {
    const row = await tx.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content: content.trim(),
        warnNonFriend: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarColor: true,
            avatarUrl: true,
          },
        },
      },
    });
    await tx.directConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return row;
  });

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    sender: {
      id: message.sender.id,
      name: message.sender.name,
      handle: message.sender.handle,
      avatarColor: message.sender.avatarColor,
      avatarUrl: message.sender.avatarUrl ?? undefined,
    },
    content: message.content,
    warnNonFriend: message.warnNonFriend,
    createdAt: formatPostedAt(message.createdAt),
    isOwn: true,
  };
}

export async function editDirectMessage(
  userId: string,
  messageId: string,
  content: string,
) {
  const existing = await prisma.directMessage.findUnique({
    where: { id: messageId },
  });
  if (!existing || existing.deletedAt) throw new DmNotFoundError("Message not found.");
  if (existing.senderId !== userId) throw new DmForbiddenError();

  const updated = await prisma.directMessage.update({
    where: { id: messageId },
    data: { content: content.trim(), editedAt: new Date() },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    conversationId: updated.conversationId,
    senderId: updated.senderId,
    content: updated.content,
    warnNonFriend: updated.warnNonFriend,
    editedAt: formatPostedAt(updated.editedAt!),
    createdAt: formatPostedAt(updated.createdAt),
  };
}

export async function deleteDirectMessage(userId: string, messageId: string) {
  const existing = await prisma.directMessage.findUnique({
    where: { id: messageId },
  });
  if (!existing || existing.deletedAt) throw new DmNotFoundError("Message not found.");
  if (existing.senderId !== userId) throw new DmForbiddenError();

  await prisma.directMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  return { id: messageId, conversationId: existing.conversationId };
}

export function getDmRoomId(conversationId: string) {
  return `dm:${conversationId}`;
}

async function getUnreadCountForConversation(
  conversationId: string,
  userId: string,
  lastReadAt: Date | null,
): Promise<number> {
  return prisma.directMessage.count({
    where: {
      conversationId,
      deletedAt: null,
      senderId: { not: userId },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
) {
  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) throw new DmNotFoundError();
  if (
    conversation.participantLowId !== userId &&
    conversation.participantHighId !== userId
  ) {
    throw new DmForbiddenError();
  }

  const now = new Date();
  await prisma.directConversationRead.upsert({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    create: { conversationId, userId, lastReadAt: now },
    update: { lastReadAt: now },
  });
  return { conversationId, readAt: now };
}

export async function getDmUnreadSummary(userId: string) {
  const conversations = await prisma.directConversation.findMany({
    where: {
      OR: [{ participantLowId: userId }, { participantHighId: userId }],
    },
    select: { id: true },
  });
  if (conversations.length === 0) {
    return { unreadChatCount: 0, totalUnreadMessages: 0 };
  }

  const conversationIds = conversations.map((row) => row.id);
  const reads = await prisma.directConversationRead.findMany({
    where: { userId, conversationId: { in: conversationIds } },
    select: { conversationId: true, lastReadAt: true },
  });
  const readByConversation = new Map(
    reads.map((row) => [row.conversationId, row.lastReadAt]),
  );

  let unreadChatCount = 0;
  let totalUnreadMessages = 0;

  for (const conversation of conversations) {
    const unread = await getUnreadCountForConversation(
      conversation.id,
      userId,
      readByConversation.get(conversation.id) ?? null,
    );
    if (unread > 0) {
      unreadChatCount += 1;
      totalUnreadMessages += unread;
    }
  }

  return { unreadChatCount, totalUnreadMessages };
}
