import { getAiTasteProfileScore } from "@/lib/data/for-you";
import {
  getContinueListening,
  getContinueWatching,
  getRecommendedForYou,
  getTrendingThisWeek,
} from "@/lib/data/discover";
import { getWatchlistStats } from "@/lib/data/watchlist";
import {
  getCollectionStats,
  getRecentlyUsedCollections,
} from "@/lib/data/collections";
import { getCommunityStats, getRecommendedCommunities } from "@/lib/data/community";
import { countCatalogContent } from "@/lib/services/feed.service";

/**
 * Dashboard home — catalog carousels and user library stats from PostgreSQL.
 */

export interface HomeStats {
  aiTasteScore: number;
  watchlistSaved: number;
  watchlistPending: number;
  collections: number;
  communitiesJoined: number;
  postsViewed: number;
  newMatches: number;
  trendingCount: number;
}

const emptyWatchlistStats = {
  savedItems: 0,
  pending: 0,
  highPriority: 0,
  avgAiMatch: 0,
};

const emptyCollectionStats = {
  collections: 0,
  totalItems: 0,
  favourites: 0,
  lastUpdated: "—",
};

const emptyCommunityStats = {
  joined: 0,
  totalMembers: "0",
  postsViewed: 0,
  avgCompatibility: 0,
};

export async function getHomeStats(userId?: string): Promise<HomeStats> {
  const [tasteScore, watchlist, collections, community, catalogCount] =
    await Promise.all([
      getAiTasteProfileScore(userId),
      userId ? getWatchlistStats(userId) : emptyWatchlistStats,
      userId ? getCollectionStats(userId) : emptyCollectionStats,
      userId ? getCommunityStats(userId) : emptyCommunityStats,
      countCatalogContent(),
    ]);

  return {
    aiTasteScore: tasteScore,
    watchlistSaved: watchlist.savedItems,
    watchlistPending: watchlist.pending,
    collections: collections.collections,
    communitiesJoined: community.joined,
    postsViewed: community.postsViewed,
    newMatches: Math.min(catalogCount, 24),
    trendingCount: catalogCount,
  };
}

export async function getHomeContinueWatching(userId?: string) {
  return getContinueWatching(userId);
}

export async function getHomeRecommended(userId?: string) {
  return getRecommendedForYou(userId);
}

export async function getHomeTrending() {
  return getTrendingThisWeek();
}

export async function getHomeContinueListening(userId?: string) {
  return getContinueListening(userId);
}

export async function getHomeCommunities(userId?: string) {
  return userId ? getRecommendedCommunities(userId) : [];
}

export async function getHomeCollections(userId?: string) {
  return userId ? getRecentlyUsedCollections(userId) : [];
}
