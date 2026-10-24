import type { ContentItem, MusicTrack } from "@/types";
import { tasteProfileToActiveFilters } from "@/lib/mappers/active-taste.mapper";
import { getTasteProfileForUser } from "@/lib/services/onboarding.service";
import { prisma } from "@/lib/prisma";
import {
  getContinueListening as getContinueListeningFromDb,
  getContinueWatchingContent,
  getMusicForTaste,
  getNewReleasesContent,
  getRecommendedContent,
  getTrendingContent,
  getTrendingMusic as getTrendingMusicFromDb,
} from "@/lib/services/feed.service";
import {
  loadTasteSignals,
  rankContent,
  rankTracks,
} from "@/lib/services/taste-engine.service";

/**
 * Discover feeds — backed by PostgreSQL catalog.
 * Async accessors keep the same shape for dashboard UI components.
 */

export type { ActiveTasteFilter as ActiveFilter } from "@/lib/mappers/active-taste.mapper";

export async function getActiveFilters(userId: string) {
  const [tasteProfile, user] = await Promise.all([
    getTasteProfileForUser(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { aiTasteScore: true },
    }),
  ]);

  if (!tasteProfile?.selections) return [];

  const tasteScore = user?.aiTasteScore ?? tasteProfile.tasteScore;
  return tasteProfileToActiveFilters(tasteProfile.selections, tasteScore);
}

export async function getTrendingThisWeek(): Promise<ContentItem[]> {
  return getTrendingContent(18);
}

/** Taste-ranked picks for a signed-in user; global top-rated otherwise. */
export async function getRecommendedForYou(userId?: string): Promise<ContentItem[]> {
  if (!userId) return getRecommendedContent(18);
  const signals = await loadTasteSignals(userId);
  return rankContent(signals, { limit: 18, excludeKnown: true });
}

export async function getNewReleases(): Promise<ContentItem[]> {
  return getNewReleasesContent(18);
}

export async function getContinueWatching(userId?: string): Promise<ContentItem[]> {
  return getContinueWatchingContent(userId, 8);
}

export async function getMusicForYourTaste(userId?: string): Promise<MusicTrack[]> {
  if (!userId) return getMusicForTaste(18);
  const signals = await loadTasteSignals(userId);
  return rankTracks(signals, { limit: 18 });
}

export async function getTrendingMusic(): Promise<MusicTrack[]> {
  return getTrendingMusicFromDb(18);
}

export async function getContinueListening(userId?: string): Promise<MusicTrack[]> {
  return getContinueListeningFromDb(userId, 8);
}
