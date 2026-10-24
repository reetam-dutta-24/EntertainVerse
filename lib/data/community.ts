import type { Community, UserSummary } from "@/types";
import {
  getCommunityMemberPreview as getCommunityMembersBySlug,
  getCommunityStatsForUser,
  listJoinedCommunities,
  listMostActiveCommunities,
  listPublicCommunities,
  listRecommendedCommunities,
} from "@/lib/services/community.service";

/**
 * Community page — backed by PostgreSQL per user.
 */

export interface CommunityStats {
  joined: number;
  totalMembers: string;
  postsViewed: number;
  avgCompatibility: number;
}

export const communityGenres = [
  "All",
  "Anime",
  "Movies",
  "Shows",
  "Music",
  "Mixed",
] as const;

export const communitySorts = [
  "Recently Updated",
  "Alphabetical",
  "Largest",
  "Newest",
] as const;

export async function getCommunityStats(
  userId: string,
): Promise<CommunityStats> {
  return getCommunityStatsForUser(userId);
}

export async function getCommunityGenres(): Promise<readonly string[]> {
  return communityGenres;
}

export async function getCommunitySorts(): Promise<readonly string[]> {
  return communitySorts;
}

export async function getFavouriteCommunities(
  userId: string,
): Promise<Community[]> {
  return listJoinedCommunities(userId);
}

export async function getMostActiveCommunities(
  userId: string,
): Promise<Community[]> {
  return listMostActiveCommunities(userId, 12);
}

export async function getRecommendedCommunities(
  userId: string,
): Promise<Community[]> {
  return listRecommendedCommunities(userId, 12);
}

export async function getGlobalCommunities(): Promise<Community[]> {
  return listPublicCommunities(15);
}

export async function getCommunityMemberPreviewForSlug(
  slug?: string,
): Promise<UserSummary[]> {
  if (!slug) return [];
  return getCommunityMembersBySlug(slug, 6);
}

/** First joined community preview for dashboard cards without a slug context. */
export async function getCommunityMemberPreview(
  userId?: string,
): Promise<UserSummary[]> {
  if (!userId) return [];
  const joined = await listJoinedCommunities(userId);
  const first = joined[0];
  if (!first) return [];
  return getCommunityMembersBySlug(first.id, 6);
}
