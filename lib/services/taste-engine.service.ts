import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapContentToItem, prismaMediaTypeToApp } from "@/lib/mappers/content.mapper";
import { mapTrackToMusicTrack } from "@/lib/mappers/music.mapper";
import { mapArtistToContentItem } from "@/lib/mappers/artist.mapper";
import {
  GENRE_OPTIONS,
  MOOD_GENRES,
  MOOD_OPTIONS,
  emptyOnboardingSelection,
  normalizeOnboardingSelection,
  type OnboardingSelection,
} from "@/lib/data/onboarding-config";
import type { ContentItem, MusicTrack } from "@/types";

/**
 * Taste engine — scores the whole catalog against a user's taste profile
 * (onboarding answers) plus live signals (favorites, watchlist, follows).
 *
 * The catalog is small, so we load it once per request and rank in memory.
 * Every score is 0–1; matchScore shown on cards is derived from it.
 */

const contentInclude = {
  genres: { include: { genre: true } },
} satisfies Prisma.ContentInclude;

const trackInclude = {
  artistRef: { select: { slug: true } },
  sourceContent: { select: { slug: true, type: true } },
} satisfies Prisma.MusicTrackInclude;

type ContentRow = Prisma.ContentGetPayload<{ include: typeof contentInclude }>;
type TrackRow = Prisma.MusicTrackGetPayload<{ include: typeof trackInclude }>;
type ArtistRow = Prisma.ArtistGetPayload<object>;

/** Signals that describe one user's taste. */
export interface TasteSignals {
  selection: OnboardingSelection;
  hasProfile: boolean;
  favoriteContent: Set<string>;
  watchlist: Set<string>;
  followedArtists: Set<string>;
  favoriteTracks: Set<string>;
}

interface TasteVector {
  types: Set<string>;
  genreWeights: Map<string, number>;
  languages: Set<string>;
  musicGenres: Set<string>;
  artists: Set<string>;
  anchors: Set<string>;
  anchorGenres: Map<string, number>;
  known: Set<string>;
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.toLowerCase());
}

export const loadTasteCatalog = cache(async () => {
  const [content, tracks, artists] = await Promise.all([
    prisma.content.findMany({
      include: contentInclude,
      orderBy: [{ rating: "desc" }, { updatedAt: "desc" }],
      take: 1000,
    }),
    prisma.musicTrack.findMany({
      include: trackInclude,
      orderBy: [{ rating: "desc" }, { updatedAt: "desc" }],
      take: 1000,
    }),
    prisma.artist.findMany({
      orderBy: [{ rating: "desc" }, { title: "asc" }],
      take: 500,
    }),
  ]);
  return { content, tracks, artists };
});

function contentGenres(row: ContentRow): string[] {
  return row.genres.map((g) => g.genre.label.toLowerCase());
}

/** Signals built only from onboarding answers (used while the taste test runs). */
export function signalsFromSelection(selection: OnboardingSelection): TasteSignals {
  return {
    selection,
    hasProfile: true,
    favoriteContent: new Set(),
    watchlist: new Set(),
    followedArtists: new Set(),
    favoriteTracks: new Set(),
  };
}

export const loadTasteSignals = cache(async (userId: string): Promise<TasteSignals> => {
  const [profile, favorites, watchlist, follows, trackFavorites] = await Promise.all([
    prisma.tasteProfile.findUnique({ where: { userId }, select: { selections: true } }),
    prisma.contentFavorite.findMany({
      where: { userId },
      select: { content: { select: { slug: true } } },
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      select: { content: { select: { slug: true } } },
    }),
    prisma.artistFollow.findMany({
      where: { userId },
      select: { artist: { select: { slug: true } } },
    }),
    prisma.trackFavorite.findMany({
      where: { userId },
      select: { track: { select: { slug: true } } },
    }),
  ]);

  return {
    selection: profile
      ? normalizeOnboardingSelection(profile.selections)
      : emptyOnboardingSelection,
    hasProfile: Boolean(profile),
    favoriteContent: new Set(favorites.map((row) => row.content.slug)),
    watchlist: new Set(watchlist.map((row) => row.content.slug)),
    followedArtists: new Set(follows.map((row) => row.artist.slug)),
    favoriteTracks: new Set(trackFavorites.map((row) => row.track.slug)),
  };
});

function buildVector(signals: TasteSignals, catalog: ContentRow[]): TasteVector {
  const { selection } = signals;
  const genreWeights = new Map<string, number>();
  const bump = (genre: string, weight: number) =>
    genreWeights.set(genre, Math.min(1, Math.max(genreWeights.get(genre) ?? 0, weight)));

  for (const genre of selection.genres) bump(genre, 1);
  for (const mood of selection.moods) {
    for (const genre of MOOD_GENRES[mood] ?? []) bump(genre, 0.6);
  }

  const anchors = new Set([...selection.favoriteTitles, ...signals.favoriteContent]);
  const anchorGenres = new Map<string, number>();
  for (const row of catalog) {
    if (!anchors.has(row.slug)) continue;
    for (const genre of contentGenres(row)) {
      anchorGenres.set(genre, (anchorGenres.get(genre) ?? 0) + 1);
    }
  }
  // Favorites also teach genre taste — lighter than explicit picks.
  const anchorTotal = Math.max(1, anchors.size);
  for (const [genre, count] of anchorGenres) bump(genre, 0.35 + 0.4 * (count / anchorTotal));

  return {
    types: new Set(selection.contentTypes),
    genreWeights,
    languages: new Set(selection.languages),
    musicGenres: new Set(selection.musicTastes),
    artists: new Set([...selection.artists, ...signals.followedArtists]),
    anchors,
    anchorGenres,
    known: new Set([...anchors, ...signals.watchlist]),
  };
}

function quality(rating: number | null | undefined, fallback = 7): number {
  return Math.min(1, Math.max(0, (rating ?? fallback) / 10));
}

/** Content quality on a steeper curve — a 4/10 film shouldn't ride on genre alone. */
function contentQuality(rating: number | null | undefined): number {
  return Math.min(1, Math.max(0, ((rating ?? 7) - 4) / 5.5));
}

const FRANCHISE_STOPWORDS = new Set(["the", "a", "an"]);

/** Rough franchise key from the slug: "after-we-fell" → "after", "the-matrix-reloaded" → "the-matrix". */
function franchiseKey(slug: string): string {
  const parts = slug.split("-");
  return FRANCHISE_STOPWORDS.has(parts[0]) ? parts.slice(0, 2).join("-") : parts[0];
}

/** Greedy re-rank that damps repeats of the same franchise so one series can't fill a row. */
function diversify<T extends { row: ContentRow; score: number }>(scored: T[], take: number): T[] {
  const pool = [...scored].sort((a, b) => b.score - a.score);
  const seen = new Map<string, number>();
  const picked: T[] = [];
  while (picked.length < take && pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const repeats = seen.get(franchiseKey(pool[i].row.slug)) ?? 0;
      const value = pool[i].score * Math.pow(0.82, repeats);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    const [next] = pool.splice(bestIndex, 1);
    const key = franchiseKey(next.row.slug);
    seen.set(key, (seen.get(key) ?? 0) + 1);
    picked.push(next);
  }
  return picked;
}

function toMatch(score: number): number {
  return Math.round(Math.min(99, Math.max(50, 52 + score * 47)));
}

function scoreContentRow(row: ContentRow, v: TasteVector): number {
  const type = prismaMediaTypeToApp(row.type);
  const genres = contentGenres(row);
  const languages = asStrings(row.languages);

  const typeFit = v.types.size ? (v.types.has(type) ? 1 : 0) : 0.5;

  const genreSum = genres.reduce((sum, genre) => sum + (v.genreWeights.get(genre) ?? 0), 0);
  const genreFit = genres.length
    ? Math.min(1, genreSum / Math.min(genres.length, 3))
    : 0;

  const languageFit = v.languages.size
    ? languages.some((language) => v.languages.has(language))
      ? 1
      : 0.2
    : 0.5;

  let anchorFit = 0;
  if (v.anchors.has(row.slug)) anchorFit = 1;
  else if (v.anchorGenres.size && genres.length) {
    const shared = genres.filter((genre) => v.anchorGenres.has(genre)).length;
    anchorFit = shared / genres.length;
  }

  return (
    typeFit * 0.2 +
    genreFit * 0.34 +
    languageFit * 0.08 +
    anchorFit * 0.14 +
    contentQuality(row.rating) * 0.24
  );
}

function scoreTrackRow(row: TrackRow, v: TasteVector, signals: TasteSignals): number {
  const genres = asStrings(row.genres);
  if (row.kind === "ost" && !genres.includes("ost")) genres.push("ost");

  const genreFit = v.musicGenres.size
    ? Math.min(1, genres.filter((genre) => v.musicGenres.has(genre)).length / Math.min(genres.length || 1, 2))
    : 0.4;

  const language = row.language?.toLowerCase();
  const languageFit = v.languages.size ? (language && v.languages.has(language) ? 1 : 0.2) : 0.5;

  const artistFit = row.artistRef && v.artists.has(row.artistRef.slug) ? 1 : 0;

  let sourceFit = 0;
  if (row.sourceContent) {
    if (v.anchors.has(row.sourceContent.slug)) sourceFit = 1;
    else if (v.types.has(prismaMediaTypeToApp(row.sourceContent.type))) sourceFit = 0.5;
  }

  const favoriteFit = signals.favoriteTracks.has(row.slug) ? 1 : 0;

  return (
    genreFit * 0.34 +
    languageFit * 0.14 +
    artistFit * 0.22 +
    sourceFit * 0.08 +
    favoriteFit * 0.04 +
    quality(row.rating) * 0.18
  );
}

function scoreArtistRow(row: ArtistRow, v: TasteVector): number {
  const genres = asStrings(row.genres);
  const languages = asStrings(row.languages);
  const genreFit = v.musicGenres.size
    ? Math.min(1, genres.filter((genre) => v.musicGenres.has(genre)).length / Math.min(genres.length || 1, 2))
    : 0.4;
  const languageFit = v.languages.size
    ? languages.some((language) => v.languages.has(language))
      ? 1
      : 0.3
    : 0.5;
  const picked = v.artists.has(row.slug) ? 1 : 0;
  return genreFit * 0.42 + languageFit * 0.12 + picked * 0.28 + quality(row.rating) * 0.18;
}

interface RankOptions {
  limit?: number;
  /** Skip titles the user already favorited or saved. */
  excludeKnown?: boolean;
  /** Restrict to one catalog genre id. */
  genre?: string;
  /** Restrict to any of these genre ids. */
  anyGenre?: string[];
  /** Restrict to content similar to this slug (shared genres), excluding itself. */
  similarTo?: string;
  minRating?: number;
  maxRating?: number;
  /** Leave out these slugs (already shown elsewhere on the page). */
  exclude?: Set<string>;
}

/** Score + rank catalog content for a set of signals. */
export async function rankContent(
  signals: TasteSignals,
  options: RankOptions = {},
): Promise<ContentItem[]> {
  const { content } = await loadTasteCatalog();
  const v = buildVector(signals, content);
  const similarRow = options.similarTo
    ? content.find((row) => row.slug === options.similarTo)
    : undefined;
  const similarGenres = similarRow ? new Set(contentGenres(similarRow)) : null;

  const scored = content
    .filter((row) => {
      if (options.excludeKnown && v.known.has(row.slug)) return false;
      if (options.exclude?.has(row.slug)) return false;
      const genres = contentGenres(row);
      if (options.genre && !genres.includes(options.genre)) return false;
      if (options.anyGenre && !genres.some((genre) => options.anyGenre!.includes(genre))) return false;
      if (options.minRating != null && (row.rating ?? 0) < options.minRating) return false;
      if (options.maxRating != null && (row.rating ?? 0) > options.maxRating) return false;
      if (similarGenres) {
        if (row.slug === options.similarTo) return false;
        if (!genres.some((genre) => similarGenres.has(genre))) return false;
      }
      return true;
    })
    .map((row) => {
      let score = scoreContentRow(row, v);
      if (similarRow && similarGenres) {
        const genres = contentGenres(row);
        const shared = genres.filter((genre) => similarGenres.has(genre)).length;
        const overlap = shared / Math.max(similarGenres.size, genres.length);
        const sameType = row.type === similarRow.type ? 1 : 0;
        score = score * 0.4 + overlap * 0.4 + sameType * 0.2;
      }
      return { row, score };
    });

  return diversify(scored, options.limit ?? 18).map(({ row, score }) => ({
    ...mapContentToItem(row),
    matchScore: toMatch(score),
  }));
}

export async function rankTracks(
  signals: TasteSignals,
  options: { limit?: number; kinds?: string[] } = {},
): Promise<MusicTrack[]> {
  const { content, tracks } = await loadTasteCatalog();
  const v = buildVector(signals, content);
  return tracks
    .filter((row) => !options.kinds || options.kinds.includes(row.kind))
    .map((row) => ({ row, score: scoreTrackRow(row, v, signals) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 18)
    .map(({ row, score }) => ({ ...mapTrackToMusicTrack(row), matchScore: toMatch(score) }));
}

export async function rankArtists(
  signals: TasteSignals,
  options: { limit?: number } = {},
): Promise<ContentItem[]> {
  const { content, artists } = await loadTasteCatalog();
  const v = buildVector(signals, content);
  return artists
    .map((row) => ({ row, score: scoreArtistRow(row, v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 12)
    .map(({ row, score }) => ({ ...mapArtistToContentItem(row), matchScore: toMatch(score) }));
}

/** The user's strongest genres, explicit picks first, then moods/favorites. */
export async function topGenres(signals: TasteSignals, count = 3): Promise<string[]> {
  const { content } = await loadTasteCatalog();
  const v = buildVector(signals, content);
  const available = new Map<string, number>();
  for (const row of content) {
    for (const genre of contentGenres(row)) available.set(genre, (available.get(genre) ?? 0) + 1);
  }

  const ranked = [...v.genreWeights.entries()]
    .filter(([genre]) => (available.get(genre) ?? 0) >= 3)
    .sort((a, b) => b[1] - a[1] || (available.get(b[0]) ?? 0) - (available.get(a[0]) ?? 0))
    .map(([genre]) => genre);

  if (ranked.length >= count) return ranked.slice(0, count);

  // Not enough taste data — fill with the catalog's deepest genres.
  const fallback = [...available.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre)
    .filter((genre) => !ranked.includes(genre));
  return [...ranked, ...fallback].slice(0, count);
}

export function genreLabel(genreId: string): { label: string; emoji: string } {
  const option = GENRE_OPTIONS.find((entry) => entry.id === genreId);
  return { label: option?.label ?? genreId, emoji: option?.emoji ?? "🎞️" };
}

export function moodLabel(moodId: string): { label: string; emoji: string } | null {
  const option = MOOD_OPTIONS.find((entry) => entry.id === moodId);
  return option ? { label: option.label, emoji: option.emoji } : null;
}

/** Pick the favorite we have the most "more like this" material for. */
export async function pickAnchorTitle(
  signals: TasteSignals,
): Promise<{ slug: string; title: string } | null> {
  const { content } = await loadTasteCatalog();
  const anchors = [...signals.selection.favoriteTitles, ...signals.favoriteContent];
  for (const slug of anchors) {
    const row = content.find((entry) => entry.slug === slug);
    if (row) return { slug: row.slug, title: row.title };
  }
  return null;
}

/** Average match of the user's best picks — the "AI Taste Profile" %. */
export async function computeTasteScore(signals: TasteSignals): Promise<number> {
  const top = await rankContent(signals, { limit: 10 });
  if (!top.length) return 0;
  const avg = top.reduce((sum, item) => sum + (item.matchScore ?? 0), 0) / top.length;
  return Math.round(avg);
}
