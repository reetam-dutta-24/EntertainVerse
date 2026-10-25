import type { Review as PrismaReview, User } from "@prisma/client";
import { formatCardDate } from "@/lib/format-dates";
import { roundRating } from "@/lib/format-rating";
import {
  accentToAvatarColor,
  resolveProfileAccent,
} from "@/lib/profile-theme";
import { mapArtistToContentItem } from "@/lib/mappers/artist.mapper";
import { mapCollectionToCard } from "@/lib/mappers/collection.mapper";
import { mapCommunityToCard } from "@/lib/mappers/community.mapper";
import { mapContentToItem } from "@/lib/mappers/content.mapper";
import { mapUserSummary } from "@/lib/mappers/community.mapper";
import { mapTrackToMusicTrack } from "@/lib/mappers/music.mapper";
import { formatEngagementCount } from "@/lib/format-engagement";
import { PROFILE_SECTION_IDS } from "@/lib/profile-section-ids";
import type { AnalyticsData } from "@/lib/data/analytics";
import type {
  ContentEngagementStat,
  ProfileRecentActivityItem,
  Review,
  UserProfileDetail,
} from "@/types";

type ReviewAuthor = Parameters<typeof mapUserSummary>[0];

export function mapReviewRow(
  row: PrismaReview & { author: ReviewAuthor },
  context?: { likedByViewer?: boolean },
): Review {
  return {
    id: row.id,
    author: mapUserSummary(row.author),
    rating: roundRating(row.rating) ?? 0,
    headline: row.headline ?? undefined,
    content: row.body,
    likeCount: row.likeCount,
    liked: context?.likedByViewer ?? false,
    canLike: true,
    createdAt: formatCardDate(row.createdAt),
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function formatJoinedAt(date: Date): string {
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).replace(String(day), `${day}${suffix}`);
}

export function buildEngagementStats(counts: {
  friends: number;
  artistsFollowing: number;
  watchMinutes: number;
  songsPlayed: number;
  collections: number;
  favorites: number;
  communitiesJoined: number;
  contentWatched: number;
}): ContentEngagementStat[] {
  return [
    {
      id: "friends",
      label: "Friends",
      value: formatEngagementCount(counts.friends),
      scrollTarget: PROFILE_SECTION_IDS.friends,
    },
    {
      id: "artistsFollowing",
      label: "Artists Following",
      value: formatEngagementCount(counts.artistsFollowing),
      scrollTarget: PROFILE_SECTION_IDS.artists,
    },
    {
      id: "watchtime",
      label: "Watch Time (min)",
      value: formatEngagementCount(counts.watchMinutes),
      scrollTarget: PROFILE_SECTION_IDS.analytics,
    },
    {
      id: "songsPlayed",
      label: "Songs Played",
      value: formatEngagementCount(counts.songsPlayed),
      scrollTarget: PROFILE_SECTION_IDS.favoriteSongs,
    },
    {
      id: "collections",
      label: "Collections",
      value: formatEngagementCount(counts.collections),
      scrollTarget: PROFILE_SECTION_IDS.collections,
    },
    {
      id: "favorites",
      label: "Favorites",
      value: formatEngagementCount(counts.favorites),
      scrollTarget: PROFILE_SECTION_IDS.favoriteAnime,
    },
    {
      id: "communitiesJoined",
      label: "Communities Joined",
      value: formatEngagementCount(counts.communitiesJoined),
      scrollTarget: PROFILE_SECTION_IDS.communities,
    },
    {
      id: "contentWatched",
      label: "Content Watched",
      value: formatEngagementCount(counts.contentWatched),
      scrollTarget: PROFILE_SECTION_IDS.recentActivity,
    },
    {
      id: "kpi-placeholder-1",
      label: "—",
      value: "—",
      placeholder: true,
    },
    {
      id: "kpi-placeholder-2",
      label: "—",
      value: "—",
      placeholder: true,
    },
  ];
}

export function buildProfileDetail(input: {
  user: Pick<
    User,
    | "id"
    | "handle"
    | "name"
    | "bio"
    | "location"
    | "avatarColor"
    | "avatarUrl"
    | "portraitUrl"
    | "profileAccent"
    | "aiTasteScore"
    | "createdAt"
  >;
  tasteProfile?: {
    summaryChips: unknown;
    selections: unknown;
  } | null;
  counts: {
    friends: number;
    artistsFollowing: number;
    watchMinutes: number;
    songsPlayed: number;
    collections: number;
    favorites: number;
    communitiesJoined: number;
    contentWatched: number;
  };
  favoriteAnimeShow: ReturnType<typeof mapContentToItem>[];
  favoriteMovies: ReturnType<typeof mapContentToItem>[];
  friends: ReturnType<typeof mapUserSummary>[];
  followedArtists: ReturnType<typeof mapArtistToContentItem>[];
  analytics?: AnalyticsData;
  currentActivity: ReturnType<typeof mapContentToItem>[];
  likedContent: ReturnType<typeof mapContentToItem>[];
  watchedMost: ReturnType<typeof mapContentToItem>[];
  likedSongs: ReturnType<typeof mapTrackToMusicTrack>[];
  mostPlayedSongs: ReturnType<typeof mapTrackToMusicTrack>[];
  likedAlbums: ReturnType<typeof mapTrackToMusicTrack>[];
  topArtists: ReturnType<typeof mapArtistToContentItem>[];
  collections: ReturnType<typeof mapCollectionToCard>[];
  communities: ReturnType<typeof mapCommunityToCard>[];
  reviews: Review[];
  recentActivity: ProfileRecentActivityItem[];
  nowListening?: UserProfileDetail["nowListening"];
  currentlyWatching?: UserProfileDetail["currentlyWatching"];
  activitySubtitle?: string;
  followerCount?: number;
  followers?: ReturnType<typeof mapUserSummary>[];
  followerSummary?: string;
  viewerFriendStatus?: UserProfileDetail["viewerFriendStatus"];
  incomingFriendRequestId?: string;
  viewerFollows?: boolean;
  isPrivatePreview?: boolean;
  online?: boolean;
}): UserProfileDetail {
  const summaryChips = asStringArray(input.tasteProfile?.summaryChips);
  const selections =
    input.tasteProfile?.selections &&
    typeof input.tasteProfile.selections === "object"
      ? (input.tasteProfile.selections as {
          contentTypes?: string[];
          genres?: string[];
          musicTastes?: string[];
        })
      : null;

  const favoriteTypes = [
    ...(selections?.contentTypes ?? []),
    ...(selections?.musicTastes ?? []),
  ];
  const favoriteGenres = selections?.genres ?? [];

  const profileAccent = resolveProfileAccent(
    input.user.profileAccent,
    input.user.avatarColor,
  );
  const avatarColor = accentToAvatarColor(
    profileAccent,
    input.user.avatarColor,
  );

  const portraitUrl =
    input.user.portraitUrl ??
    input.user.avatarUrl ??
    "/images/hero-1.png";

  return {
    id: input.user.handle,
    name: input.user.name,
    handle: input.user.handle,
    bio: input.user.bio || "No bio yet.",
    avatarColor,
    avatarUrl: input.user.avatarUrl ?? undefined,
    profileAccent,
    portraitUrl,
    location: input.user.location || "Earth",
    online: input.online ?? false,
    followerCount: input.followerCount ?? 0,
    joinedAt: formatJoinedAt(input.user.createdAt),
    activitySubtitle: input.activitySubtitle,
    matchScore: input.user.aiTasteScore || undefined,
    primaryTags:
      summaryChips.length > 0
        ? summaryChips
        : favoriteGenres.slice(0, 5),
    engagementStats: buildEngagementStats(input.counts),
    nowListening: input.nowListening,
    currentlyWatching: input.currentlyWatching,
    favoriteTypes,
    favoriteGenres,
    followers: input.followers ?? [],
    followerSummary: input.followerSummary,
    viewerFriendStatus: input.viewerFriendStatus,
    incomingFriendRequestId: input.incomingFriendRequestId,
    viewerFollows: input.viewerFollows,
    isPrivatePreview: input.isPrivatePreview,
    recentActivity: input.recentActivity,
    favoriteAnimeShow: input.favoriteAnimeShow,
    favoriteMovies: input.favoriteMovies,
    friends: input.friends,
    followedArtists: input.followedArtists,
    analytics: input.analytics,
    currentActivity: input.currentActivity,
    likedContent: input.likedContent,
    watchedMost: input.watchedMost,
    likedSongs: input.likedSongs,
    mostPlayedSongs: input.mostPlayedSongs,
    likedAlbums: input.likedAlbums,
    topArtists: input.topArtists,
    collections: input.collections,
    communities: input.communities,
    reviews: input.reviews,
  };
}
