import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  mapCommunityPost,
  mapCommunityToCard,
  mapCommunityToCardWithMembers,
  mapCommunityToDetail,
  mapUserSummary,
} from "@/lib/mappers/community.mapper";
import { mapCollectionToCard } from "@/lib/mappers/collection.mapper";
import { mapContentToItem } from "@/lib/mappers/content.mapper";
import { slugify } from "@/lib/slugify";
import type { Community, CommunityDetail, UserSummary } from "@/types";
import type {
  CommunityFormInput,
  CommunityPostFormInput,
  CommunityPostUpdateInput,
  CommunityUpdateInput,
} from "@/lib/validators/community";
import {
  getContinueWatchingContent,
  getTrendingContent,
  getTrendingMusic,
} from "@/lib/services/feed.service";
import { notifyCommunityPost } from "@/lib/services/notification.service";
import { getLikedPostIds } from "@/lib/services/like.service";
import { areUsersFriends, listUserFriends } from "@/lib/services/follow.service";
import {
  listCommunityVoiceChannels,
  listCommunityWatchChannels,
} from "@/lib/services/community-channel.service";
import {
  generateJoinCode,
  hashJoinCode,
  joinCodeLookup as buildJoinCodeLookup,
  normalizeJoinCode,
  verifyJoinCode,
} from "@/lib/community-join-code";

/**
 * The recommender is server-only (it needs the Next server runtime). Load it lazily so
 * this service can still be imported by the plain-Node Socket.IO server (server.ts).
 */
const loadSocialRecommender = () => import("@/lib/recommender/social");

const communityInclude = {
  members: {
    take: 100,
    orderBy: { joinedAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarColor: true,
          avatarUrl: true,
          aiTasteScore: true,
        },
      },
    },
  },
} satisfies Prisma.CommunityInclude;

async function getCommunityRecordBySlug(slug: string) {
  return prisma.community.findUnique({
    where: { slug },
    include: communityInclude,
  });
}

async function syncCommunityMemberCount(communityId: string) {
  const memberCount = await prisma.communityMember.count({
    where: { communityId },
  });
  await prisma.community.update({
    where: { id: communityId },
    data: { memberCount },
  });
  return memberCount;
}

async function buildPrivateJoinCredentials(input: {
  joinCode?: string;
  memberLimit?: number;
}) {
  const memberLimit = input.memberLimit ?? 50;
  const plainCode = input.joinCode?.trim()
    ? normalizeJoinCode(input.joinCode)
    : generateJoinCode();
  const lookup = buildJoinCodeLookup(plainCode);
  const hash = await hashJoinCode(plainCode);
  return { memberLimit, plainCode, lookup, hash };
}

async function assertCommunityHasCapacity(community: {
  id: string;
  memberCount: number;
  memberLimit: number | null;
}) {
  if (
    community.memberLimit != null &&
    community.memberCount >= community.memberLimit
  ) {
    throw new CommunityForbiddenError(
      "This community has reached its member limit.",
    );
  }
}

async function addCommunityMember(
  userId: string,
  community: {
    id: string;
    memberCount: number;
    memberLimit: number | null;
    slug: string;
  },
) {
  await assertCommunityHasCapacity(community);

  const existing = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });
  if (existing) return { membership: existing, slug: community.slug, joined: false };

  const membership = await prisma.communityMember.create({
    data: { userId, communityId: community.id, role: "MEMBER" },
  });
  await syncCommunityMemberCount(community.id);
  return { membership, slug: community.slug, joined: true };
}

async function syncCommunityPostCount(communityId: string) {
  const postCount = await prisma.communityPost.count({
    where: { communityId },
  });
  await prisma.community.update({
    where: { id: communityId },
    data: { postCount, updatedAt: new Date() },
  });
  return postCount;
}

export async function listJoinedCommunities(userId: string): Promise<Community[]> {
  const rows = await prisma.community.findMany({
    where: { members: { some: { userId } } },
    include: communityInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => mapCommunityToCardWithMembers(row, userId));
}

export async function listPublicCommunities(limit = 24): Promise<Community[]> {
  const rows = await prisma.community.findMany({
    where: { visibility: "PUBLIC" },
    include: communityInclude,
    orderBy: [{ memberCount: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => mapCommunityToCardWithMembers(row));
}

export async function listRecommendedCommunities(
  userId: string,
  limit = 12,
): Promise<Community[]> {
  const rows = await prisma.community.findMany({
    where: {
      visibility: "PUBLIC",
      members: { none: { userId } },
    },
    include: communityInclude,
    orderBy: [{ memberCount: "desc" }, { postCount: "desc" }],
    take: 60,
  });
  // Ranked by the recommender: taste fit + members who love what the viewer loves.
  const picks = await loadSocialRecommender()
    .then(({ rankCommunitiesForUser }) => rankCommunitiesForUser(userId, rows))
    .catch((error) => {
    // Ranking is a bonus — fall back to popularity order rather than failing the page.
    console.error("[recommender] communities", error);
    return new Map();
  });
  return rows
    .map((row) => ({ row, pick: picks.get(row.id) }))
    .sort((a, b) => (b.pick?.score ?? 0) - (a.pick?.score ?? 0))
    .slice(0, limit)
    .map(({ row, pick }) => ({ ...mapCommunityToCardWithMembers(row), reason: pick?.reason }));
}

export async function listMostActiveCommunities(
  userId: string,
  limit = 12,
): Promise<Community[]> {
  const rows = await prisma.community.findMany({
    where: { members: { some: { userId } } },
    include: communityInclude,
    orderBy: [{ postCount: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => mapCommunityToCardWithMembers(row, userId));
}

export async function getCommunityStatsForUser(userId: string) {
  const memberships = await prisma.communityMember.findMany({
    where: { userId },
    include: {
      community: { select: { memberCount: true } },
      user: { select: { aiTasteScore: true } },
    },
  });

  const joined = memberships.length;
  const totalMembers = memberships.reduce(
    (sum, membership) => sum + membership.community.memberCount,
    0,
  );
  const postsViewed = await prisma.communityPost.count({
    where: { community: { members: { some: { userId } } } },
  });
  const scores = memberships
    .map((membership) => membership.user.aiTasteScore)
    .filter((score) => score > 0);
  const avgCompatibility =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;

  return {
    joined,
    totalMembers:
      totalMembers >= 1000
        ? `${(totalMembers / 1000).toFixed(1)}K`
        : String(totalMembers),
    postsViewed,
    avgCompatibility,
  };
}

export async function createCommunity(userId: string, input: CommunityFormInput) {
  const slug = input.slug?.trim() || slugify(input.name);

  let memberLimit: number | null = null;
  let joinCodeLookup: string | null = null;
  let joinCodeHash: string | null = null;
  let issuedJoinCode: string | undefined;

  if (input.visibility === "PRIVATE") {
    const credentials = await buildPrivateJoinCredentials({
      joinCode: input.joinCode,
      memberLimit: input.memberLimit,
    });
    memberLimit = credentials.memberLimit;
    joinCodeLookup = credentials.lookup;
    joinCodeHash = credentials.hash;
    issuedJoinCode = credentials.plainCode;
  }

  const community = await prisma.community.create({
    data: {
      slug,
      name: input.name.trim(),
      category: input.category,
      description: input.description?.trim() || null,
      visibility: input.visibility,
      activityLevel: input.activityLevel ?? "active",
      accent: input.accent ?? "cyan",
      imageUrl: input.imageUrl?.trim() || null,
      wallpaperUrl: input.wallpaperUrl?.trim() || null,
      memberCount: 1,
      memberLimit,
      joinCodeLookup,
      joinCodeHash,
    },
  });

  await prisma.communityMember.create({
    data: {
      userId,
      communityId: community.id,
      role: "ADMIN",
    },
  });

  const row = await getCommunityRecordBySlug(community.slug);
  return { row, joinCode: issuedJoinCode };
}

export async function updateCommunity(
  userId: string,
  slug: string,
  input: CommunityUpdateInput,
) {
  const membership = await prisma.communityMember.findFirst({
    where: {
      userId,
      community: { slug },
      role: { in: ["ADMIN", "MODERATOR"] },
    },
    include: { community: true },
  });
  if (!membership) throw new CommunityNotFoundError("Community not found.");

  const becomingPrivate = input.visibility === "PRIVATE";
  const becomingPublic = input.visibility === "PUBLIC";
  let joinCredentials:
    | Awaited<ReturnType<typeof buildPrivateJoinCredentials>>
    | undefined;

  if (becomingPrivate && membership.community.visibility !== "PRIVATE") {
    joinCredentials = await buildPrivateJoinCredentials({
      memberLimit: input.memberLimit ?? membership.community.memberLimit ?? 50,
      joinCode: input.joinCode,
    });
  } else if (
    becomingPrivate &&
    membership.community.visibility === "PRIVATE" &&
    input.joinCode?.trim()
  ) {
    joinCredentials = await buildPrivateJoinCredentials({
      joinCode: input.joinCode,
      memberLimit: input.memberLimit ?? membership.community.memberLimit ?? 50,
    });
  }

  const row = await prisma.community.update({
    where: { id: membership.communityId },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.visibility ? { visibility: input.visibility } : {}),
      ...(input.activityLevel ? { activityLevel: input.activityLevel } : {}),
      ...(input.accent ? { accent: input.accent } : {}),
      ...(input.imageUrl !== undefined
        ? { imageUrl: input.imageUrl?.trim() || null }
        : {}),
      ...(input.wallpaperUrl !== undefined
        ? { wallpaperUrl: input.wallpaperUrl?.trim() || null }
        : {}),
      ...(input.memberLimit !== undefined
        ? { memberLimit: input.memberLimit }
        : {}),
      ...(becomingPublic
        ? {
            memberLimit: null,
            joinCodeLookup: null,
            joinCodeHash: null,
          }
        : {}),
      ...(joinCredentials
        ? {
            memberLimit: joinCredentials.memberLimit,
            joinCodeLookup: joinCredentials.lookup,
            joinCodeHash: joinCredentials.hash,
          }
        : {}),
    },
    include: communityInclude,
  });

  return {
    row,
    joinCode: joinCredentials?.plainCode,
  };
}

export async function deleteCommunity(userId: string, slug: string) {
  const membership = await prisma.communityMember.findFirst({
    where: { userId, community: { slug }, role: "ADMIN" },
    include: { community: true },
  });
  if (!membership) throw new CommunityNotFoundError("Community not found.");
  return prisma.community.delete({ where: { id: membership.communityId } });
}

export async function joinCommunity(userId: string, slug: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new CommunityNotFoundError("Community not found.");
  if (community.visibility === "PRIVATE") {
    throw new CommunityForbiddenError(
      "This community is private. Use a room code to join.",
    );
  }

  return addCommunityMember(userId, community);
}

export async function joinCommunityByCode(userId: string, rawCode: string) {
  const normalized = normalizeJoinCode(rawCode);
  if (normalized.length < 4) {
    throw new CommunityForbiddenError("Enter a valid room code.");
  }

  const lookup = buildJoinCodeLookup(normalized);
  const community = await prisma.community.findUnique({
    where: { joinCodeLookup: lookup },
  });

  if (!community?.joinCodeHash || community.visibility !== "PRIVATE") {
    throw new CommunityNotFoundError("Invalid room code.");
  }

  const valid = await verifyJoinCode(normalized, community.joinCodeHash);
  if (!valid) {
    throw new CommunityNotFoundError("Invalid room code.");
  }

  return addCommunityMember(userId, community);
}

export async function regenerateCommunityJoinCode(userId: string, slug: string) {
  const membership = await prisma.communityMember.findFirst({
    where: {
      userId,
      community: { slug },
      role: "ADMIN",
    },
    include: { community: true },
  });
  if (!membership) throw new CommunityNotFoundError("Community not found.");
  if (membership.community.visibility !== "PRIVATE") {
    throw new CommunityForbiddenError(
      "Room codes are only used for private communities.",
    );
  }

  const credentials = await buildPrivateJoinCredentials({
    memberLimit: membership.community.memberLimit ?? 50,
  });

  await prisma.community.update({
    where: { id: membership.communityId },
    data: {
      joinCodeLookup: credentials.lookup,
      joinCodeHash: credentials.hash,
    },
  });

  return {
    joinCode: credentials.plainCode,
    memberLimit: credentials.memberLimit,
  };
}

export async function getCommunityJoinCodeStatus(userId: string, slug: string) {
  const membership = await prisma.communityMember.findFirst({
    where: {
      userId,
      community: { slug },
      role: { in: ["ADMIN", "MODERATOR"] },
    },
    include: {
      community: {
        select: {
          visibility: true,
          memberLimit: true,
          memberCount: true,
          joinCodeHash: true,
        },
      },
    },
  });
  if (!membership) return null;

  const { community } = membership;
  return {
    isPrivate: community.visibility === "PRIVATE",
    hasJoinCode: Boolean(community.joinCodeHash),
    memberLimit: community.memberLimit,
    memberCount: community.memberCount,
    canManage: membership.role === "ADMIN",
  };
}

export async function leaveCommunity(userId: string, slug: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new CommunityNotFoundError("Community not found.");

  const membership = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });
  if (!membership) throw new CommunityNotFoundError("You are not a member.");

  await prisma.communityMember.delete({
    where: { userId_communityId: { userId, communityId: community.id } },
  });
  await syncCommunityMemberCount(community.id);
}

export async function listCommunityPosts(
  slug: string,
  limit = 20,
  kind?: "POST" | "ANNOUNCEMENT",
) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new CommunityNotFoundError("Community not found.");

  return prisma.communityPost.findMany({
    where: {
      communityId: community.id,
      ...(kind ? { kind } : {}),
    },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createCommunityPost(
  userId: string,
  slug: string,
  input: CommunityPostFormInput,
) {
  const membership = await prisma.communityMember.findFirst({
    where: { userId, community: { slug } },
    include: { community: true },
  });
  if (!membership) throw new CommunityForbiddenError("Join the community first.");

  const kind = input.kind ?? "POST";
  if (kind === "ANNOUNCEMENT" && !["ADMIN", "MODERATOR"].includes(membership.role)) {
    throw new CommunityForbiddenError("Only admins and moderators can post announcements.");
  }

  const post = await prisma.communityPost.create({
    data: {
      communityId: membership.communityId,
      authorId: userId,
      title: input.title.trim(),
      content: input.content?.trim() || input.title.trim(),
      imageUrl: input.imageUrl?.trim() || null,
      kind,
    },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true, avatarUrl: true },
      },
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  await syncCommunityPostCount(membership.communityId);

  await notifyCommunityPost(post.community, {
    id: post.id,
    title: post.title,
    authorId: post.authorId,
    authorName: post.author.name,
  });

  return post;
}

export async function updateCommunityPost(
  userId: string,
  slug: string,
  postId: string,
  input: CommunityPostUpdateInput,
) {
  const post = await prisma.communityPost.findFirst({
    where: {
      id: postId,
      authorId: userId,
      community: { slug },
    },
  });
  if (!post) throw new CommunityNotFoundError("Post not found.");

  return prisma.communityPost.update({
    where: { id: postId },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.content !== undefined
        ? { content: input.content?.trim() || undefined }
        : {}),
      ...(input.imageUrl !== undefined
        ? { imageUrl: input.imageUrl?.trim() || null }
        : {}),
    },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true, avatarUrl: true },
      },
    },
  });
}

export async function deleteCommunityPost(
  userId: string,
  slug: string,
  postId: string,
) {
  const post = await prisma.communityPost.findFirst({
    where: {
      id: postId,
      community: { slug },
      OR: [
        { authorId: userId },
        {
          community: {
            members: {
              some: {
                userId,
                role: { in: ["ADMIN", "MODERATOR"] },
              },
            },
          },
        },
      ],
    },
  });
  if (!post) throw new CommunityNotFoundError("Post not found.");

  await prisma.communityPost.delete({ where: { id: postId } });
  await syncCommunityPostCount(post.communityId);
}

export async function getCommunityMemberPreview(
  slug: string,
  limit = 6,
): Promise<UserSummary[]> {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) return [];

  const members = await prisma.communityMember.findMany({
    where: { communityId: community.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
    take: limit,
  });

  return members.map((member) => mapUserSummary(member.user));
}

const CATEGORY_MEDIA: Record<string, string> = {
  Anime: "ANIME",
  Movies: "MOVIE",
  Shows: "SHOW",
};

async function getCommunityFavoriteContent(
  category: string,
  limit = 8,
) {
  const mediaType = CATEGORY_MEDIA[category];
  const rows = await prisma.content.findMany({
    where: mediaType ? { type: mediaType as "ANIME" | "MOVIE" | "SHOW" } : {},
    include: { genres: { include: { genre: true } } },
    orderBy: [{ rating: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return rows.map(mapContentToItem);
}

export async function getCommunityDetailBySlug(
  slug: string,
  viewerUserId?: string,
): Promise<CommunityDetail | null> {
  const row = await getCommunityRecordBySlug(slug);
  if (!row) return null;

  if (row.visibility === "PRIVATE") {
    const isMember = viewerUserId
      ? row.members.some((member) => member.userId === viewerUserId)
      : false;
    if (!isMember) return null;
  }

  const [posts, announcements, voiceChannels, watchChannels, watchedMost, trending, musicTracks, collections, similarRows, categoryContent] =
    await Promise.all([
      listCommunityPosts(slug, 24, "POST"),
      listCommunityPosts(slug, 12, "ANNOUNCEMENT"),
      listCommunityVoiceChannels(slug, viewerUserId),
      listCommunityWatchChannels(slug, viewerUserId),
      viewerUserId
        ? getContinueWatchingContent(viewerUserId, 8)
        : getTrendingContent(8),
      getTrendingContent(8),
      getTrendingMusic(8),
      prisma.collection.findMany({
        where: {
          visibility: "PUBLIC",
          category: row.category,
        },
        orderBy: { favoriteCount: "desc" },
        take: 4,
        include: { _count: { select: { favorites: true } } },
      }),
      prisma.community.findMany({
        where: {
          slug: { not: slug },
          visibility: "PUBLIC",
          ...(viewerUserId
            ? { members: { none: { userId: viewerUserId } } }
            : {}),
        },
        include: communityInclude,
        orderBy: { memberCount: "desc" },
        take: 4,
      }),
      getCommunityFavoriteContent(row.category, 8),
    ]);

  const allPostIds = [...posts, ...announcements].map((post) => post.id);
  const likedPostIds = await getLikedPostIds(viewerUserId, allPostIds);

  return mapCommunityToDetail(row, {
    posts,
    announcements,
    voiceChannels,
    watchChannels,
    viewerUserId,
    likedPostIds,
    memberPreview: row.members.map((member) => mapUserSummary(member.user)),
    onlineMembers: row.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      handle: member.user.handle,
      avatarColor: member.user.avatarColor,
      avatarUrl: member.user.avatarUrl ?? undefined,
      role:
        member.role === "ADMIN"
          ? "admin"
          : member.role === "MODERATOR"
            ? "moderator"
            : "member",
      online: true,
      joinedAt: undefined,
    })),
    collections: collections.map((row) => mapCollectionToCard(row)),
    similarCommunities: similarRows.map(mapCommunityToCard),
    watchedMost,
    trending,
    musicTracks,
    favoriteItems: categoryContent.slice(0, 6),
  });
}

export async function listAllCommunitySlugs() {
  const rows = await prisma.community.findMany({
    select: { slug: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => row.slug);
}

export { mapCommunityPost };

export async function listUserJoinedCommunities(userId: string) {
  const rows = await prisma.communityMember.findMany({
    where: { userId },
    include: { community: true },
    orderBy: { joinedAt: "desc" },
  });
  return rows.map((row) => row.community);
}

async function requireCommunityAdmin(userId: string, slug: string) {
  const membership = await prisma.communityMember.findFirst({
    where: { userId, community: { slug }, role: "ADMIN" },
    include: { community: true },
  });
  if (!membership) {
    throw new CommunityForbiddenError("Only community admins can do this.");
  }
  return membership;
}

export async function listCommunityMembers(slug: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw new CommunityNotFoundError("Community not found.");

  const members = await prisma.communityMember.findMany({
    where: { communityId: community.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  return members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    handle: member.user.handle,
    avatarColor: member.user.avatarColor,
    avatarUrl: member.user.avatarUrl ?? undefined,
    role:
      member.role === "ADMIN"
        ? ("admin" as const)
        : member.role === "MODERATOR"
          ? ("moderator" as const)
          : ("member" as const),
    joinedAt: member.joinedAt,
  }));
}

export async function listInviteableFriendsForCommunity(
  adminId: string,
  slug: string,
) {
  const membership = await requireCommunityAdmin(adminId, slug);
  if (membership.community.visibility !== "PRIVATE") {
    throw new CommunityForbiddenError(
      "Friend invites are only available for private communities.",
    );
  }

  const friends = await listUserFriends(adminId, 100);
  const memberIds = new Set(
    (
      await prisma.communityMember.findMany({
        where: { communityId: membership.communityId },
        select: { userId: true },
      })
    ).map((row) => row.userId),
  );

  return friends
    .filter((friend) => !memberIds.has(friend.id))
    .map((friend) => ({
      id: friend.id,
      name: friend.name,
      handle: friend.handle,
      avatarColor: friend.avatarColor,
      avatarUrl: friend.avatarUrl ?? undefined,
    }));
}

export async function addFriendToCommunity(
  adminId: string,
  slug: string,
  friendUserId: string,
) {
  const membership = await requireCommunityAdmin(adminId, slug);
  if (membership.community.visibility !== "PRIVATE") {
    throw new CommunityForbiddenError(
      "Friend invites are only available for private communities.",
    );
  }

  const friends = await areUsersFriends(adminId, friendUserId);
  if (!friends) {
    throw new CommunityForbiddenError("You can only add mutual friends.");
  }

  return addCommunityMember(friendUserId, membership.community);
}

export async function removeCommunityMember(
  actorId: string,
  slug: string,
  targetUserId: string,
) {
  const actorMembership = await requireCommunityAdmin(actorId, slug);
  const target = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: {
        userId: targetUserId,
        communityId: actorMembership.communityId,
      },
    },
  });
  if (!target) throw new CommunityNotFoundError("Member not found.");
  if (target.userId === actorId) {
    throw new CommunityForbiddenError("Use leave community to remove yourself.");
  }
  if (target.role === "ADMIN") {
    throw new CommunityForbiddenError("Cannot remove another admin.");
  }

  await prisma.communityMember.delete({
    where: { id: target.id },
  });
  await syncCommunityMemberCount(actorMembership.communityId);
  return { removed: true };
}

export async function updateCommunityMemberRole(
  adminId: string,
  slug: string,
  targetUserId: string,
  role: "MODERATOR" | "MEMBER",
) {
  await requireCommunityAdmin(adminId, slug);

  const target = await prisma.communityMember.findFirst({
    where: {
      userId: targetUserId,
      community: { slug },
    },
  });
  if (!target) throw new CommunityNotFoundError("Member not found.");
  if (target.role === "ADMIN") {
    throw new CommunityForbiddenError("Cannot change an admin's role.");
  }
  if (target.userId === adminId) {
    throw new CommunityForbiddenError("You cannot change your own role.");
  }

  return prisma.communityMember.update({
    where: { id: target.id },
    data: { role },
  });
}

export class CommunityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommunityNotFoundError";
  }
}

export class CommunityForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommunityForbiddenError";
  }
}

export class CommunityConflictError extends Error {
  constructor() {
    super("A community with this slug already exists.");
    this.name = "CommunityConflictError";
  }
}

export function isCommunityConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}
