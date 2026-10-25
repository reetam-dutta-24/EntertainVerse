import { prisma } from "@/lib/prisma";
import { mapArtistToContentItem } from "@/lib/mappers/artist.mapper";
import { mapCollectionToCard } from "@/lib/mappers/collection.mapper";
import { mapCommunityToCard } from "@/lib/mappers/community.mapper";
import { mapContentToItem } from "@/lib/mappers/content.mapper";
import {
  buildProfileDetail,
  mapReviewRow,
} from "@/lib/mappers/user-profile.mapper";
import { mapUserSummary } from "@/lib/mappers/community.mapper";
import { mapTrackToMusicTrack } from "@/lib/mappers/music.mapper";
import {
  getFollowerCount,
  getRecentFollowers,
  getViewerFriendStatus,
  listUserFriends,
} from "@/lib/services/follow.service";
import { getAnalyticsForUser } from "@/lib/services/analytics.service";
import { getLikedReviewIds } from "@/lib/services/like.service";
import { normalizeProfileSlug } from "@/lib/profile-routes";
import { normalizeHandle } from "@/lib/services/user.service";
import type { ProfileSearchItem } from "@/lib/search/types";
import type { UserProfileDetail } from "@/types";

const contentInclude = {
  genres: { include: { genre: true } },
} as const;

const ANIME_SHOW_TYPES = new Set(["ANIME", "SHOW", "KDRAMA"]);

const ONLINE_WINDOW_MS = 30 * 60 * 1000;

async function resolveUserOnline(
  userId: string,
  viewerUserId?: string,
): Promise<boolean> {
  if (viewerUserId === userId) return true;

  const [latestWatch, latestListen] = await Promise.all([
    prisma.watchEvent.findFirst({
      where: { userId },
      orderBy: { watchedAt: "desc" },
      select: { watchedAt: true },
    }),
    prisma.listenEvent.findFirst({
      where: { userId },
      orderBy: { listenedAt: "desc" },
      select: { listenedAt: true },
    }),
  ]);

  const latestActivity = Math.max(
    latestWatch?.watchedAt.getTime() ?? 0,
    latestListen?.listenedAt.getTime() ?? 0,
  );

  if (latestActivity === 0) return false;
  return Date.now() - latestActivity <= ONLINE_WINDOW_MS;
}

export class UserProfileNotFoundError extends Error {
  constructor() {
    super("User profile not found.");
    this.name = "UserProfileNotFoundError";
  }
}

export class UserProfilePrivateError extends Error {
  constructor() {
    super("This profile is private.");
    this.name = "UserProfilePrivateError";
  }
}

async function findUserRecord(profileSlug: string) {
  const handle = normalizeProfileSlug(profileSlug);

  return prisma.user.findFirst({
    where: {
      // Handle first; a user id also works for places that only know the id (e.g. party members).
      OR: [{ handle }, { handle: normalizeHandle(profileSlug) }, { id: profileSlug.trim() }],
    },
    include: {
      preferences: true,
      tasteProfile: true,
    },
  });
}

function topTracksByPlayCount<
  T extends { track: Parameters<typeof mapTrackToMusicTrack>[0] },
>(rows: T[], limit = 8) {
  const counts = new Map<string, { track: T["track"]; count: number }>();

  for (const row of rows) {
    const existing = counts.get(row.track.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(row.track.id, { track: row.track, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => mapTrackToMusicTrack(entry.track));
}

function uniqueTracks<
  T extends { track: Parameters<typeof mapTrackToMusicTrack>[0] },
>(rows: T[], limit = 8) {
  const seen = new Set<string>();
  const tracks = [];

  for (const row of rows) {
    if (seen.has(row.track.id)) continue;
    seen.add(row.track.id);
    tracks.push(mapTrackToMusicTrack(row.track));
    if (tracks.length >= limit) break;
  }

  return tracks;
}

function topContentByWatchCount(
  rows: Array<{
    content: Parameters<typeof mapContentToItem>[0];
    minutes: number;
  }>,
  limit = 8,
) {
  const counts = new Map<
    string,
    { content: Parameters<typeof mapContentToItem>[0]; minutes: number }
  >();

  for (const row of rows) {
    const existing = counts.get(row.content.id);
    if (existing) {
      existing.minutes += row.minutes;
    } else {
      counts.set(row.content.id, {
        content: row.content,
        minutes: row.minutes,
      });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, limit)
    .map((entry) => mapContentToItem(entry.content));
}

function favoritesByContentTypes<
  T extends { content: Parameters<typeof mapContentToItem>[0] },
>(rows: T[], types: Set<string>, limit = 8) {
  return rows
    .filter((row) => types.has(row.content.type))
    .slice(0, limit)
    .map((row) => mapContentToItem(row.content));
}

function buildRecentActivity(
  watchRows: Array<{
    id: string;
    content: Parameters<typeof mapContentToItem>[0];
    watchedAt: Date;
  }>,
  listenRows: Array<{
    id: string;
    track: Parameters<typeof mapTrackToMusicTrack>[0];
    listenedAt: Date;
  }>,
  limit = 24,
): import("@/types").ProfileRecentActivityItem[] {
  type Entry = import("@/types").ProfileRecentActivityItem & { at: number };

  const entries: Entry[] = [
    ...watchRows.map((row) => ({
      id: `watch-${row.id}`,
      kind: "content" as const,
      item: mapContentToItem(row.content),
      at: row.watchedAt.getTime(),
    })),
    ...listenRows.map((row) => ({
      id: `listen-${row.id}`,
      kind: "music" as const,
      track: mapTrackToMusicTrack(row.track),
      at: row.listenedAt.getTime(),
    })),
  ];

  entries.sort((a, b) => b.at - a.at);

  const seen = new Set<string>();
  const unique: Entry[] = [];

  for (const entry of entries) {
    const key =
      entry.kind === "content"
        ? `content:${entry.item.id}`
        : `music:${entry.track.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
    if (unique.length >= limit) break;
  }

  return unique.map(({ at: _at, ...rest }) => rest);
}

function buildCurrentlyWatching(
  activeWatch:
    | {
        content: Parameters<typeof mapContentToItem>[0];
        status: string;
      }
    | undefined,
  latestWatch:
    | {
        content: Parameters<typeof mapContentToItem>[0];
      }
    | undefined,
) {
  const source = activeWatch?.content ?? latestWatch?.content;
  if (!source) return undefined;

  const item = mapContentToItem(source);
  return {
    title: item.title,
    contentId: item.id,
    isActive: Boolean(activeWatch),
    episodeLabel: activeWatch ? item.meta : undefined,
    genres: item.genres,
    durationLabel: item.meta,
  };
}

export async function getUserProfileDetail(
  profileSlug: string,
  viewerUserId?: string,
): Promise<UserProfileDetail | null> {
  const user = await findUserRecord(profileSlug);
  if (!user) return null;

  const isOwner = viewerUserId === user.id;
  const isPublic = user.preferences?.publicProfile ?? true;
  const viewerFriend =
    viewerUserId && !isOwner
      ? await getViewerFriendStatus(viewerUserId, user.id)
      : { status: "none" as const };
  const isFriend = viewerFriend.status === "friends";

  if (!isPublic && !isOwner && !isFriend) {
    const followerCount = await getFollowerCount(user.id);
    return buildProfileDetail({
      user: { ...user, bio: "This profile is private." },
      tasteProfile: null,
      counts: {
        friends: followerCount,
        artistsFollowing: 0,
        watchMinutes: 0,
        songsPlayed: 0,
        collections: 0,
        favorites: 0,
        communitiesJoined: 0,
        contentWatched: 0,
      },
      favoriteAnimeShow: [],
      favoriteMovies: [],
      friends: [],
      followedArtists: [],
      currentActivity: [],
      likedContent: [],
      watchedMost: [],
      likedSongs: [],
      mostPlayedSongs: [],
      likedAlbums: [],
      topArtists: [],
      collections: [],
      communities: [],
      reviews: [],
      recentActivity: [],
      followerCount,
      followers: [],
      followerSummary:
        followerCount > 0 ? `${followerCount} friends` : undefined,
      viewerFriendStatus: viewerFriend.status,
      incomingFriendRequestId: viewerFriend.incomingFriendRequestId,
      viewerFollows: false,
      activitySubtitle: "This profile is private",
      isPrivatePreview: true,
    });
  }

  const showHistory = isOwner || (user.preferences?.showWatchHistory ?? false);

  const [
    watchlistRows,
    favoriteRows,
    collectionRows,
    communityRows,
    reviewRows,
    listenRows,
    activityWatchRows,
    watchRows,
    albumRows,
    artistFollowRows,
    trackFavoriteRows,
    counts,
    watchMinutes,
    listenCount,
    artistFollowCount,
    followerCount,
    recentFollowers,
    friendRows,
    analytics,
    communitiesCount,
    watchedContentRows,
    isOnline,
  ] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: { userId: user.id },
      include: { content: { include: contentInclude } },
      orderBy: { addedAt: "desc" },
      take: 24,
    }),
    prisma.contentFavorite.findMany({
      where: { userId: user.id },
      include: { content: { include: contentInclude } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.collection.findMany({
      where: {
        userId: user.id,
        ...(isOwner ? {} : { visibility: "PUBLIC" }),
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.communityMember.findMany({
      where: {
        userId: user.id,
        ...(isOwner ? {} : { community: { visibility: "PUBLIC" } }),
      },
      include: { community: true },
      orderBy: { joinedAt: "desc" },
      take: 12,
    }),
    prisma.review.findMany({
      where: { authorId: user.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarColor: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.listenEvent.findMany({
      where: { userId: user.id },
      include: { track: { include: { artistRef: true } } },
      orderBy: { listenedAt: "desc" },
      take: 80,
    }),
    prisma.watchEvent.findMany({
      where: { userId: user.id },
      include: { content: { include: contentInclude } },
      orderBy: { watchedAt: "desc" },
      take: 80,
    }),
    showHistory
      ? prisma.watchEvent.findMany({
          where: { userId: user.id },
          include: { content: { include: contentInclude } },
          orderBy: { watchedAt: "desc" },
          take: 80,
        })
      : Promise.resolve([]),
    prisma.musicTrack.findMany({
      where: {
        kind: "album",
        OR: [
          {
            collectionItems: {
              some: { collection: { userId: user.id } },
            },
          },
          {
            listenEvents: {
              some: { userId: user.id },
            },
          },
        ],
      },
      orderBy: { rating: "desc" },
      take: 8,
    }),
    prisma.artistFollow.findMany({
      where: { userId: user.id },
      include: { artist: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.trackFavorite.findMany({
      where: { userId: user.id },
      include: { track: { include: { artistRef: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    Promise.all([
      prisma.collection.count({ where: { userId: user.id } }),
      prisma.contentFavorite.count({ where: { userId: user.id } }),
    ]),
    prisma.watchEvent.aggregate({
      where: { userId: user.id },
      _sum: { minutes: true },
    }),
    prisma.listenEvent.count({ where: { userId: user.id } }),
    prisma.artistFollow.count({ where: { userId: user.id } }),
    getFollowerCount(user.id),
    getRecentFollowers(user.id, 3),
    listUserFriends(user.id, 24),
    getAnalyticsForUser(user.id),
    prisma.communityMember.count({ where: { userId: user.id } }),
    prisma.watchEvent.findMany({
      where: { userId: user.id },
      distinct: ["contentId"],
      select: { contentId: true },
    }),
    resolveUserOnline(user.id, viewerUserId),
  ]);

  const likedReviewIds = await getLikedReviewIds(
    viewerUserId,
    reviewRows.map((row) => row.id),
  );

  const [collectionsCount, favoritesCount] = counts;

  let favoriteAnimeShow = favoritesByContentTypes(
    favoriteRows,
    ANIME_SHOW_TYPES,
    8,
  );
  if (favoriteAnimeShow.length === 0 && showHistory) {
    favoriteAnimeShow = topContentByWatchCount(
      watchRows.filter((row) => ANIME_SHOW_TYPES.has(row.content.type)),
      8,
    );
  }

  let favoriteMovies = favoritesByContentTypes(
    favoriteRows,
    new Set(["MOVIE"]),
    8,
  );
  if (favoriteMovies.length === 0 && showHistory) {
    favoriteMovies = topContentByWatchCount(
      watchRows.filter((row) => row.content.type === "MOVIE"),
      8,
    );
  }

  const watchingItems = watchlistRows
    .filter((row) => row.status === "WATCHING")
    .map((row) => mapContentToItem(row.content));

  const currentActivity =
    watchingItems.length > 0
      ? watchingItems.slice(0, 6)
      : watchlistRows.slice(0, 6).map((row) => mapContentToItem(row.content));

  const likedContent = favoriteRows
    .slice(0, 8)
    .map((row) => mapContentToItem(row.content));

  const watchedMost = showHistory
    ? topContentByWatchCount(watchRows, 8)
    : watchlistRows
        .filter((row) => row.status === "COMPLETED")
        .slice(0, 8)
        .map((row) => mapContentToItem(row.content));

  const favoriteSongRows =
    trackFavoriteRows.length > 0
      ? trackFavoriteRows.map((row) => row.track)
      : listenRows.map((row) => row.track);

  const likedSongs = uniqueTracks(
    favoriteSongRows.map((track) => ({ track })),
    8,
  );
  const mostPlayedSongs = topTracksByPlayCount(listenRows, 8);
  const likedAlbums = albumRows.map(mapTrackToMusicTrack);

  const followedArtists = artistFollowRows.map((row) =>
    mapArtistToContentItem(row.artist),
  );
  const topArtists = followedArtists;

  const recentActivity = buildRecentActivity(
    activityWatchRows,
    listenRows,
    24,
  );

  const activeWatch = watchlistRows.find((row) => row.status === "WATCHING");
  const latestWatch = activityWatchRows[0] ?? watchRows[0];
  const latestListen = listenRows[0];
  const currentlyWatching = buildCurrentlyWatching(activeWatch, latestWatch);

  const activitySubtitle = (() => {
    if (recentActivity.length === 0) return undefined;
    const latest = recentActivity[0];
    if (latest.kind === "content") {
      return `Recently watched ${latest.item.title}`;
    }
    return `Recently listened to ${latest.track.title}`;
  })();

  const followerSummary =
    followerCount > recentFollowers.length
      ? `....+${Math.max(0, followerCount - recentFollowers.length)} friends`
      : followerCount === 0
        ? undefined
        : `${followerCount} friends`;

  return buildProfileDetail({
    user,
    tasteProfile: user.tasteProfile,
    counts: {
      friends: followerCount,
      artistsFollowing: artistFollowCount,
      watchMinutes: watchMinutes._sum.minutes ?? 0,
      songsPlayed: listenCount,
      collections: collectionsCount,
      favorites: favoritesCount,
      communitiesJoined: communitiesCount,
      contentWatched: watchedContentRows.length,
    },
    favoriteAnimeShow,
    favoriteMovies,
    friends: friendRows.map(mapUserSummary),
    followedArtists,
    analytics,
    currentActivity,
    likedContent,
    watchedMost,
    likedSongs,
    mostPlayedSongs,
    likedAlbums,
    topArtists,
    collections: collectionRows.map(mapCollectionToCard),
    communities: communityRows.map((row) => mapCommunityToCard(row.community)),
    reviews: reviewRows.map((row) =>
      mapReviewRow(row, { likedByViewer: likedReviewIds.has(row.id) }),
    ),
    recentActivity,
    nowListening: latestListen
      ? {
          title: latestListen.track.title,
          artist: latestListen.track.artistRef?.title ?? latestListen.track.artist,
          artistId: latestListen.track.artistRef?.slug,
          songId: latestListen.track.slug,
        }
      : undefined,
    currentlyWatching,
    activitySubtitle,
    followerCount,
    followers: recentFollowers.map(mapUserSummary),
    followerSummary,
    viewerFriendStatus: isOwner ? undefined : viewerFriend.status,
    incomingFriendRequestId: isOwner
      ? undefined
      : viewerFriend.incomingFriendRequestId,
    viewerFollows: isOwner ? undefined : viewerFriend.status === "friends",
    online: isOnline,
  });
}

export async function searchUserProfiles(
  query: string,
  limit = 8,
): Promise<ProfileSearchItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { handle: { contains: normalizeHandle(q), mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      handle: true,
      name: true,
      bio: true,
      avatarColor: true,
      avatarUrl: true,
      portraitUrl: true,
      _count: { select: { followers: true } },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.handle,
    name: row.name,
    handle: row.handle,
    avatarColor: row.avatarColor,
    portraitUrl: row.portraitUrl ?? row.avatarUrl ?? "/images/hero-1.png",
    followerCount: row._count.followers,
    bio: row.bio || undefined,
  }));
}

export async function listPublicProfileHandles(limit = 50): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { preferences: { is: null } },
        { preferences: { is: { publicProfile: true } } },
      ],
    },
    select: { handle: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => row.handle);
}

export async function getUserProfileByHandle(
  handle: string,
  viewerUserId?: string,
): Promise<UserProfileDetail> {
  const profile = await getUserProfileDetail(handle, viewerUserId);
  if (!profile) {
    const exists = await prisma.user.findFirst({
      where: { handle: normalizeProfileSlug(handle) },
      select: { id: true, preferences: { select: { publicProfile: true } } },
    });
    if (exists && exists.preferences?.publicProfile === false) {
      throw new UserProfilePrivateError();
    }
    throw new UserProfileNotFoundError();
  }
  return profile;
}
