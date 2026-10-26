import { prisma } from "@/lib/prisma";
import {
  notifyFriendRequest,
  notifyFriendRequestAccepted,
} from "@/lib/services/notification.service";

export type ViewerFriendStatus =
  | "none"
  | "friends"
  | "pending_outgoing"
  | "pending_incoming";

export class FollowNotFoundError extends Error {
  constructor(message = "User not found.") {
    super(message);
    this.name = "FollowNotFoundError";
  }
}

export class FollowForbiddenError extends Error {
  constructor(message = "You cannot follow yourself.") {
    super(message);
    this.name = "FollowForbiddenError";
  }
}

export class FriendRequestNotFoundError extends Error {
  constructor(message = "Friend request not found.") {
    super(message);
    this.name = "FriendRequestNotFoundError";
  }
}

export class FriendRequestForbiddenError extends Error {
  constructor(message = "You cannot respond to this friend request.") {
    super(message);
    this.name = "FriendRequestForbiddenError";
  }
}

export function isFollowNotFound(error: unknown): error is FollowNotFoundError {
  return error instanceof FollowNotFoundError;
}

export function isFollowForbidden(error: unknown): error is FollowForbiddenError {
  return error instanceof FollowForbiddenError;
}

export function isFriendRequestNotFound(
  error: unknown,
): error is FriendRequestNotFoundError {
  return error instanceof FriendRequestNotFoundError;
}

export function isFriendRequestForbidden(
  error: unknown,
): error is FriendRequestForbiddenError {
  return error instanceof FriendRequestForbiddenError;
}

async function createMutualFollows(
  userAId: string,
  userBId: string,
  tx: Pick<typeof prisma, "userFollow"> = prisma,
) {
  await tx.userFollow.upsert({
    where: {
      followerId_followingId: { followerId: userAId, followingId: userBId },
    },
    create: { followerId: userAId, followingId: userBId },
    update: {},
  });
  await tx.userFollow.upsert({
    where: {
      followerId_followingId: { followerId: userBId, followingId: userAId },
    },
    create: { followerId: userBId, followingId: userAId },
    update: {},
  });
}

async function removeMutualFollows(userAId: string, userBId: string) {
  await prisma.userFollow.deleteMany({
    where: {
      OR: [
        { followerId: userAId, followingId: userBId },
        { followerId: userBId, followingId: userAId },
      ],
    },
  });
}

export async function areUsersFriends(
  userAId: string,
  userBId: string,
): Promise<boolean> {
  const [aFollowsB, bFollowsA] = await Promise.all([
    prisma.userFollow.findUnique({
      where: {
        followerId_followingId: { followerId: userAId, followingId: userBId },
      },
    }),
    prisma.userFollow.findUnique({
      where: {
        followerId_followingId: { followerId: userBId, followingId: userAId },
      },
    }),
  ]);
  return Boolean(aFollowsB && bFollowsA);
}

export async function getViewerFriendStatus(
  viewerId: string,
  targetUserId: string,
): Promise<{
  status: ViewerFriendStatus;
  incomingFriendRequestId?: string;
}> {
  if (viewerId === targetUserId) {
    return { status: "none" };
  }

  const [friends, outgoing, incoming] = await Promise.all([
    areUsersFriends(viewerId, targetUserId),
    prisma.friendRequest.findFirst({
      where: {
        requesterId: viewerId,
        recipientId: targetUserId,
        status: "PENDING",
      },
      select: { id: true },
    }),
    prisma.friendRequest.findFirst({
      where: {
        requesterId: targetUserId,
        recipientId: viewerId,
        status: "PENDING",
      },
      select: { id: true },
    }),
  ]);

  if (friends) return { status: "friends" };
  if (outgoing) return { status: "pending_outgoing" };
  if (incoming) {
    return {
      status: "pending_incoming",
      incomingFriendRequestId: incoming.id,
    };
  }
  return { status: "none" };
}

export async function getViewerFriendStatusByHandle(
  viewerId: string,
  targetHandle: string,
) {
  const target = await prisma.user.findUnique({
    where: { handle: targetHandle },
    select: { id: true },
  });
  if (!target) return { status: "none" as const };
  return getViewerFriendStatus(viewerId, target.id);
}

/** @deprecated Use areUsersFriends — kept for callers expecting one-way follow checks. */
export async function isUserFollowing(
  followerId: string,
  followingHandle: string,
): Promise<boolean> {
  const target = await prisma.user.findUnique({
    where: { handle: followingHandle },
    select: { id: true },
  });
  if (!target) return false;

  return areUsersFriends(followerId, target.id);
}

export async function countMutualFriends(userId: string): Promise<number> {
  const following = await prisma.userFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  if (following.length === 0) return 0;

  return prisma.userFollow.count({
    where: {
      followerId: { in: following.map((row) => row.followingId) },
      followingId: userId,
    },
  });
}

export async function getFollowerCount(userId: string): Promise<number> {
  return countMutualFriends(userId);
}

export async function getFriendCount(userId: string): Promise<number> {
  return countMutualFriends(userId);
}

export async function getRecentFollowers(userId: string, limit = 3) {
  const following = await prisma.userFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  if (following.length === 0) return [];

  const mutualIds = (
    await prisma.userFollow.findMany({
      where: {
        followerId: { in: following.map((row) => row.followingId) },
        followingId: userId,
      },
      select: { followerId: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  ).map((row) => row.followerId);

  if (mutualIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: mutualIds } },
    select: {
      id: true,
      name: true,
      handle: true,
      avatarColor: true,
      avatarUrl: true,
    },
  });

  const byId = new Map(users.map((user) => [user.id, user]));
  return mutualIds
    .map((id) => byId.get(id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));
}

export async function listUserFriends(userId: string, limit = 50) {
  const following = await prisma.userFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  if (following.length === 0) return [];

  const mutualIds = (
    await prisma.userFollow.findMany({
      where: {
        followerId: { in: following.map((row) => row.followingId) },
        followingId: userId,
      },
      select: { followerId: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  ).map((row) => row.followerId);

  if (mutualIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: mutualIds } },
    select: {
      id: true,
      name: true,
      handle: true,
      avatarColor: true,
      avatarUrl: true,
    },
  });

  const byId = new Map(users.map((user) => [user.id, user]));
  return mutualIds
    .map((id) => byId.get(id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));
}

async function finalizeFriendship(
  requesterId: string,
  recipientId: string,
  requestId: string,
) {
  const [requester, recipient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: requesterId },
      select: { id: true, name: true, handle: true },
    }),
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, handle: true },
    }),
  ]);
  if (!requester || !recipient) throw new FollowNotFoundError();

  await prisma.$transaction(async (tx) => {
    await tx.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });
    await createMutualFollows(requesterId, recipientId, tx);
    await tx.notification.updateMany({
      where: {
        userId: recipientId,
        actionType: "friend_request",
        actionRefId: requestId,
      },
      data: { read: true },
    });
  });

  await notifyFriendRequestAccepted({
    accepterId: recipient.id,
    accepterName: recipient.name,
    accepterHandle: recipient.handle,
    requesterId: requester.id,
  });

  const friendCount = await countMutualFriends(recipientId);
  return {
    friendStatus: "friends" as const,
    friendCount,
    followerCount: friendCount,
    handle: requester.handle,
  };
}

export async function acceptFriendRequest(requestId: string, userId: string) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requesterId: true,
      recipientId: true,
      status: true,
      requester: { select: { handle: true } },
    },
  });
  if (!request || request.status !== "PENDING") {
    throw new FriendRequestNotFoundError();
  }
  if (request.recipientId !== userId) {
    throw new FriendRequestForbiddenError();
  }

  return finalizeFriendship(
    request.requesterId,
    request.recipientId,
    request.id,
  );
}

export async function rejectFriendRequest(requestId: string, userId: string) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    select: { id: true, recipientId: true, status: true },
  });
  if (!request || request.status !== "PENDING") {
    throw new FriendRequestNotFoundError();
  }
  if (request.recipientId !== userId) {
    throw new FriendRequestForbiddenError();
  }

  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    }),
    prisma.notification.updateMany({
      where: {
        userId,
        actionType: "friend_request",
        actionRefId: requestId,
      },
      data: { read: true },
    }),
  ]);

  return { friendStatus: "none" as const };
}

export async function toggleUserFollow(actorId: string, targetHandle: string) {
  const target = await prisma.user.findUnique({
    where: { handle: targetHandle },
    select: { id: true, handle: true, name: true },
  });
  if (!target) throw new FollowNotFoundError();
  if (target.id === actorId) throw new FollowForbiddenError();

  const { status, incomingFriendRequestId } = await getViewerFriendStatus(
    actorId,
    target.id,
  );

  if (status === "friends") {
    await removeMutualFollows(actorId, target.id);
    const friendCount = await countMutualFriends(target.id);
    return {
      following: false,
      friendStatus: "none" as const,
      friendCount,
      followerCount: friendCount,
      handle: target.handle,
    };
  }

  if (status === "pending_outgoing") {
    const pending = await prisma.friendRequest.findFirst({
      where: {
        requesterId: actorId,
        recipientId: target.id,
        status: "PENDING",
      },
      select: { id: true },
    });
    await prisma.friendRequest.deleteMany({
      where: {
        requesterId: actorId,
        recipientId: target.id,
        status: "PENDING",
      },
    });
    if (pending) {
      await prisma.notification.deleteMany({
        where: {
          actionType: "friend_request",
          actionRefId: pending.id,
        },
      });
    }
    const friendCount = await countMutualFriends(target.id);
    return {
      following: false,
      friendStatus: "none" as const,
      friendCount,
      followerCount: friendCount,
      handle: target.handle,
    };
  }

  if (status === "pending_incoming" && incomingFriendRequestId) {
    return acceptFriendRequest(incomingFriendRequestId, actorId);
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { name: true, handle: true, avatarUrl: true },
  });

  // Re-checked here, not only via `status` above: they may have sent theirs a moment ago,
  // and accepting beats leaving two opposite pending requests.
  const reversePending = await prisma.friendRequest.findFirst({
    where: {
      requesterId: target.id,
      recipientId: actorId,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (reversePending) {
    return acceptFriendRequest(reversePending.id, actorId);
  }

  const request = await prisma.friendRequest.upsert({
    where: {
      requesterId_recipientId: {
        requesterId: actorId,
        recipientId: target.id,
      },
    },
    create: {
      requesterId: actorId,
      recipientId: target.id,
      status: "PENDING",
    },
    update: {
      status: "PENDING",
    },
  });

  await notifyFriendRequest({
    requestId: request.id,
    requesterId: actorId,
    requesterName: actor?.name ?? "Someone",
    requesterHandle: actor?.handle ?? targetHandle,
    requesterAvatarUrl: actor?.avatarUrl ?? undefined,
    recipientId: target.id,
    recipientHandle: target.handle,
  });

  const friendCount = await countMutualFriends(target.id);
  return {
    following: false,
    friendStatus: "pending_outgoing" as const,
    friendCount,
    followerCount: friendCount,
    handle: target.handle,
  };
}
