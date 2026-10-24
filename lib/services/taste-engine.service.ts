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
import { labelForSongGenre } from "@/lib/catalog-enums";
import { parseListenPrefs, parseWatchPrefs, type ListenPrefs, type WatchPrefs } from "@/lib/ai-profile/schema";
import { VOCAB } from "@/lib/ai-profile/vocabulary";
import { dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import {
  RELATED_SIMILARITY,
  answersAnchor,
  topShareCutoff,
  blendScore,
  buildAnchors,
  closestAnchor,
  coOccurrence,
  decayedWeight,
  loadInteractionGraph,
  minMax,
  tasteCentroid,
  type Anchor,
  type AnchorInput,
} from "@/lib/recommender/hybrid";
import type { ContentItem, MusicTrack } from "@/types";

/**
 * Taste engine — scores the whole catalog against a user's taste profile
 * (onboarding answers) plus live signals (favorites, watchlist, follows,
 * watch/listen history).
 *
 * Hybrid ranking: these explicit-preference scores are blended with semantic
 * similarity from a pre-trained embedding model and item-item collaborative
 * filtering (see lib/recommender). Every pick carries a "why this" reason.
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
  /** Signed-in user — left out of "fans also like" counts. */
  userId?: string;
  /** Recent viewing by content slug, 0–1 (decayed, half-life 30 days). */
  watched: Map<string, number>;
  /** Recent listening by track slug, 0–1 (decayed, half-life 30 days). */
  listened: Map<string, number>;
  /** AI-mode answers (quiz or chat) and their embeddings — see Settings → AI profile. */
  ai?: { watch: WatchPrefs; listen: ListenPrefs; watchVector: number[]; listenVector: number[] };
}

interface TasteVector {
  /** Genres the user asked AI mode to avoid. */
  avoidGenres: Set<string>;
  avoidLongSeries: boolean;
  commitment: string;
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
    watched: new Map(),
    listened: new Map(),
  };
}

/** Sum decayed minutes per slug, scaled so the most-played item is 1. */
function historyWeights(rows: { slug: string; minutes: number; at: Date }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.slug, (totals.get(row.slug) ?? 0) + decayedWeight(row.minutes, row.at));
  const max = Math.max(0, ...totals.values());
  return max ? new Map([...totals].map(([slug, total]) => [slug, total / max])) : totals;
}

export const loadTasteSignals = cache(async (userId: string): Promise<TasteSignals> => {
  const since = new Date(Date.now() - 180 * 86_400_000);
  const [profile, favorites, watchlist, follows, trackFavorites, watches, listens, aiProfile] = await Promise.all([
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
    prisma.watchEvent.findMany({
      where: { userId, watchedAt: { gte: since } },
      select: { minutes: true, watchedAt: true, content: { select: { slug: true } } },
    }),
    prisma.listenEvent.findMany({
      where: { userId, listenedAt: { gte: since } },
      select: { minutes: true, listenedAt: true, track: { select: { slug: true } } },
    }),
    prisma.aiTasteProfile.findUnique({ where: { userId } }),
  ]);
  // The user can switch off learning from activity (Settings → AI profile).
  const learn = aiProfile?.learnFromActivity ?? true;

  return {
    selection: profile
      ? normalizeOnboardingSelection(profile.selections)
      : emptyOnboardingSelection,
    hasProfile: Boolean(profile),
    favoriteContent: new Set(favorites.map((row) => row.content.slug)),
    watchlist: new Set(watchlist.map((row) => row.content.slug)),
    followedArtists: new Set(follows.map((row) => row.artist.slug)),
    favoriteTracks: new Set(trackFavorites.map((row) => row.track.slug)),
    userId,
    watched: learn ? historyWeights(watches.map((row) => ({ slug: row.content.slug, minutes: row.minutes, at: row.watchedAt }))) : new Map(),
    listened: learn ? historyWeights(listens.map((row) => ({ slug: row.track.slug, minutes: row.minutes, at: row.listenedAt }))) : new Map(),
    ai: aiProfile
      ? {
          watch: parseWatchPrefs(aiProfile.watch),
          listen: parseListenPrefs(aiProfile.listen),
          watchVector: aiProfile.watchVector,
          listenVector: aiProfile.listenVector,
        }
      : undefined,
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
  const watchAnswers = signals.ai?.watch;
  const listenAnswers = signals.ai?.listen;
  for (const vibe of watchAnswers?.vibes ?? []) {
    for (const genre of VOCAB.vibes.get(vibe)?.genres ?? []) bump(genre, 0.65);
  }
  const avoidGenres = new Set((watchAnswers?.avoid ?? []).flatMap((id) => VOCAB.avoid.get(id)?.genres ?? []));
  for (const genre of avoidGenres) genreWeights.delete(genre);

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
    avoidGenres,
    avoidLongSeries: watchAnswers?.avoid.includes("long-series") ?? false,
    commitment: watchAnswers?.commitment ?? "",
    types: new Set([...selection.contentTypes, ...(watchAnswers?.formats ?? [])]),
    genreWeights,
    languages: new Set([...selection.languages, ...(watchAnswers?.languages ?? []), ...(listenAnswers?.languages ?? [])]),
    musicGenres: new Set([...selection.musicTastes, ...(listenAnswers?.genres ?? [])]),
    artists: new Set([...selection.artists, ...signals.followedArtists]),
    anchors,
    anchorGenres,
    known: new Set([...anchors, ...signals.watchlist, ...signals.watched.keys()]),
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

const TYPE_WORDS: Record<string, string> = {
  anime: "anime",
  show: "show",
  movie: "film",
  documentary: "documentary",
  kdrama: "K-drama",
};

const titleCase = (text: string) => text.replace(/\b\w/g, (char) => char.toUpperCase());
const genreWord = (genre: string) => genreLabel(genre).label || titleCase(genre);

/** "Fits your vibe · Cozy & Found family" — from the strongest AI-mode answers. */
function vibeReason(prefs: WatchPrefs) {
  const labels = [
    ...prefs.vibes.map((id) => VOCAB.vibes.get(id)?.label),
    ...prefs.themes.map((id) => VOCAB.themes.get(id)?.label),
  ].filter(Boolean);
  return labels.length ? `Fits your vibe · ${labels.slice(0, 2).join(" & ")}` : "Fits what you told AI mode";
}

function listenVibeReason(prefs: ListenPrefs) {
  const labels = prefs.moods.map((id) => VOCAB.listenMoods.get(id)?.label).filter(Boolean);
  return labels.length ? `Fits your ${labels.slice(0, 2).join(" & ")} mood` : "Fits what you told AI mode";
}

/** The answers anchor's reason, when this item is among the closest to the answers. */
function answersMatch(anchors: Anchor[], vector: Vector | undefined, cutoff: number) {
  const answers = anchors.find((anchor) => anchor.reason);
  if (!answers?.vector || !vector) return null;
  return dot(vector, answers.vector) >= cutoff ? answers.reason! : null;
}

interface ContentContext {
  anchors: Anchor[];
  profile: Vector | null;
  vectorOf: (row: ContentRow) => Vector | undefined;
  rowOf: (slug: string) => ContentRow | undefined;
  collab: ReturnType<typeof coOccurrence>;
  /** Similarity an item needs to the AI-mode answers for "Fits your vibe". */
  vibeCutoff: number;
}

/** What the user has shown interest in, placed in embedding space. */
async function contentContext(signals: TasteSignals, content: ContentRow[]): Promise<ContentContext> {
  const [index, graph] = await Promise.all([loadEmbeddingIndex(), loadInteractionGraph()]);
  const bySlug = new Map(content.map((row) => [row.slug, row]));
  const inputs: AnchorInput[] = [];
  const push = (slug: string, verb: string, weight: number) => {
    const row = bySlug.get(slug);
    if (row) inputs.push({ kind: "content", itemId: row.id, slug, title: row.title, verb, weight });
  };
  for (const slug of signals.favoriteContent) push(slug, "loved", 1);
  for (const slug of signals.selection.favoriteTitles) push(slug, "picked", 0.9);
  for (const [slug, weight] of signals.watched) push(slug, "watched", 0.3 + 0.55 * weight);
  for (const slug of signals.watchlist) push(slug, "saved", 0.35);
  const anchors = buildAnchors(index, inputs);
  const answers = signals.ai ? answersAnchor("content", signals.ai.watchVector, vibeReason(signals.ai.watch)) : null;
  if (answers) anchors.push(answers);
  const vectorOf = (row: ContentRow) => index.vectors.get(embeddingKey("content", row.id));
  return {
    anchors,
    profile: tasteCentroid(anchors),
    vectorOf,
    rowOf: (slug) => bySlug.get(slug),
    collab: coOccurrence(anchors, graph.content, signals.userId),
    vibeCutoff: answers?.vector ? topShareCutoff(answers.vector, content.flatMap((row) => vectorOf(row) ?? [])) : Infinity,
  };
}

/** Spoiler-free "why this": the closest thing the user liked, what they share, or the taste it fits. */
function explainContent(row: ContentRow, v: TasteVector, ctx: ContentContext, similarRow?: ContentRow): string {
  const genres = contentGenres(row);
  const sharedWith = (other: ContentRow | undefined) => {
    if (!other) return "";
    const otherGenres = new Set(contentGenres(other));
    const shared = genres.filter((genre) => otherGenres.has(genre)).slice(0, 2).map(genreWord);
    return shared.length ? ` · ${shared.join(" & ")}` : "";
  };

  if (similarRow) return `Similar in feel to ${similarRow.title}${sharedWith(similarRow)}`;

  const near = closestAnchor(ctx.vectorOf(row), ctx.anchors, row.slug);
  if (near && near.similarity >= RELATED_SIMILARITY) {
    return `Because you ${near.anchor.verb} ${near.anchor.title}${sharedWith(ctx.rowOf(near.anchor.slug))}`;
  }
  const vibe = answersMatch(ctx.anchors, ctx.vectorOf(row), ctx.vibeCutoff);
  if (vibe) return vibe;
  const fans = ctx.collab.get(row.slug);
  if (fans) return `Fans of ${fans.via.title} also watch this`;

  const liked = genres.filter((genre) => (v.genreWeights.get(genre) ?? 0) >= 0.6).slice(0, 2).map(genreWord);
  if (liked.length) return `Matches your love of ${liked.join(" & ")}`;
  const typeWord = TYPE_WORDS[prismaMediaTypeToApp(row.type)] ?? "pick";
  if ((row.rating ?? 0) >= 8) return `Top-rated ${typeWord} · ${row.rating!.toFixed(1)}/10`;
  return genres.length ? `A ${genreWord(genres[0]!)} ${typeWord} to widen your taste` : "Picked to widen your taste";
}

interface MusicContext {
  anchors: Anchor[];
  profile: Vector | null;
  trackVector: (row: TrackRow) => Vector | undefined;
  artistVector: (row: ArtistRow) => Vector | undefined;
  collab: ReturnType<typeof coOccurrence>;
  vibeCutoff: number;
}

/** Music taste: loved/played tracks, followed artists, and (lightly) loved shows for OSTs. */
async function musicContext(
  signals: TasteSignals,
  catalog: Awaited<ReturnType<typeof loadTasteCatalog>>,
): Promise<MusicContext> {
  const [index, graph] = await Promise.all([loadEmbeddingIndex(), loadInteractionGraph()]);
  const trackBySlug = new Map(catalog.tracks.map((row) => [row.slug, row]));
  const artistBySlug = new Map(catalog.artists.map((row) => [row.slug, row]));
  const contentBySlug = new Map(catalog.content.map((row) => [row.slug, row]));
  const inputs: AnchorInput[] = [];
  const track = (slug: string, verb: string, weight: number) => {
    const row = trackBySlug.get(slug);
    if (row) inputs.push({ kind: "track", itemId: row.id, slug, title: row.title, verb, weight });
  };
  const artist = (slug: string, verb: string, weight: number) => {
    const row = artistBySlug.get(slug);
    if (row) inputs.push({ kind: "artist", itemId: row.id, slug, title: row.title, verb, weight });
  };
  for (const slug of signals.favoriteTracks) track(slug, "loved", 1);
  for (const [slug, weight] of signals.listened) track(slug, "played", 0.3 + 0.55 * weight);
  for (const slug of signals.followedArtists) artist(slug, "follow", 0.8);
  for (const slug of signals.selection.artists) artist(slug, "picked", 0.7);
  for (const slug of signals.favoriteContent) {
    const row = contentBySlug.get(slug);
    if (row) inputs.push({ kind: "content", itemId: row.id, slug, title: row.title, verb: "loved", weight: 0.3 });
  }
  const anchors = buildAnchors(index, inputs);
  const answers = signals.ai ? answersAnchor("track", signals.ai.listenVector, listenVibeReason(signals.ai.listen)) : null;
  if (answers) anchors.push(answers);
  const trackVector = (row: TrackRow) => index.vectors.get(embeddingKey("track", row.id));
  return {
    anchors,
    profile: tasteCentroid(anchors),
    vibeCutoff: answers?.vector ? topShareCutoff(answers.vector, catalog.tracks.flatMap((row) => trackVector(row) ?? [])) : Infinity,
    trackVector,
    artistVector: (row) => index.vectors.get(embeddingKey("artist", row.id)),
    collab: coOccurrence(
      anchors.filter((anchor) => anchor.kind === "track"),
      graph.tracks,
      signals.userId,
    ),
  };
}

function explainTrack(row: TrackRow, v: TasteVector, ctx: MusicContext): string {
  const source = row.sourceContent ? ctx.anchors.find((a) => a.kind === "content" && a.slug === row.sourceContent!.slug) : undefined;
  if (source) return `From ${source.title}, which you ${source.verb}`;
  if (row.artistRef && v.artists.has(row.artistRef.slug)) return `By ${row.artist}, who you follow`;

  const near = closestAnchor(ctx.trackVector(row), ctx.anchors, row.slug);
  if (near && near.similarity >= RELATED_SIMILARITY) return `Because you ${near.anchor.verb} ${near.anchor.title}`;
  const vibe = answersMatch(ctx.anchors, ctx.trackVector(row), ctx.vibeCutoff);
  if (vibe) return vibe;
  const fans = ctx.collab.get(row.slug);
  if (fans) return `Listeners of ${fans.via.title} also play this`;

  const liked = asStrings(row.genres).filter((genre) => v.musicGenres.has(genre)).slice(0, 2).map(labelForSongGenre);
  if (liked.length) return `Matches your ${liked.join(" & ")} taste`;
  const kind = row.kind === "ost" ? "OST" : "song";
  return (row.rating ?? 0) >= 8 ? `Top-rated ${kind} · ${row.rating!.toFixed(1)}/10` : `A ${kind} to widen your taste`;
}

function explainArtist(row: ArtistRow, v: TasteVector, ctx: MusicContext): string {
  if (v.artists.has(row.slug)) return "One of your artists";
  const near = closestAnchor(ctx.artistVector(row), ctx.anchors, row.slug);
  if (near && near.similarity >= RELATED_SIMILARITY) return `Because you ${near.anchor.verb} ${near.anchor.title}`;
  const liked = asStrings(row.genres).filter((genre) => v.musicGenres.has(genre)).slice(0, 2).map(labelForSongGenre);
  if (liked.length) return `Matches your ${liked.join(" & ")} taste`;
  return row.isGroup ? "A group to widen your taste" : "An artist to widen your taste";
}

/** Similarity to `target` for each row, rescaled 0–1; rows without a vector sit just below the middle. */
function semanticScores<T extends { slug: string }>(rows: T[], vectorOf: (row: T) => Vector | undefined, target: Vector | null) {
  if (!target) return { get: () => undefined as number | undefined };
  const raw = new Map<string, number>();
  for (const row of rows) {
    const vector = vectorOf(row);
    if (vector) raw.set(row.slug, dot(vector, target));
  }
  const scaled = minMax(raw);
  return { get: (slug: string) => scaled.get(slug) ?? 0.4 };
}

/** Collaborative scores rescaled so the strongest candidate is 1. */
function collabScores(collab: ReturnType<typeof coOccurrence>) {
  const max = Math.max(0, ...[...collab.values()].map((entry) => entry.score));
  return (slug: string) => (max ? (collab.get(slug)?.score ?? 0) / max : undefined);
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

  const score =
    typeFit * 0.2 +
    genreFit * 0.34 +
    languageFit * 0.08 +
    anchorFit * 0.14 +
    contentQuality(row.rating) * 0.24;

  // AI-mode answers: things to avoid and how long a commitment they want.
  let fit = 1;
  if (genres.some((genre) => v.avoidGenres.has(genre))) fit *= 0.55;
  if (v.avoidLongSeries && (row.episodeCount ?? 0) > 60) fit *= 0.6;
  const isFilm = type === "movie" || type === "documentary";
  if (v.commitment === "bite-size" && !isFilm && (row.seasonCount ?? 1) > 2) fit *= 0.85;
  if (v.commitment === "epic" && isFilm) fit *= 0.9;
  return score * fit;
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
  const ctx = await contentContext(signals, content);
  const similarRow = options.similarTo
    ? content.find((row) => row.slug === options.similarTo)
    : undefined;
  const similarGenres = similarRow ? new Set(contentGenres(similarRow)) : null;

  const pool = content
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
    });

  // "More like X" compares against X itself; otherwise against the user's taste centroid.
  const semantic = semanticScores(pool, ctx.vectorOf, similarRow ? (ctx.vectorOf(similarRow) ?? null) : ctx.profile);
  const collab = collabScores(ctx.collab);

  const scored = pool.map((row) => {
    let score = blendScore(scoreContentRow(row, v), semantic.get(row.slug), collab(row.slug));
    if (similarRow && similarGenres) {
      const genres = contentGenres(row);
      const shared = genres.filter((genre) => similarGenres.has(genre)).length;
      const overlap = shared / Math.max(similarGenres.size, genres.length);
      const likeness = semantic.get(row.slug) ?? overlap;
      const sameType = row.type === similarRow.type ? 1 : 0;
      score = score * 0.35 + likeness * 0.45 + sameType * 0.2;
    }
    return { row, score };
  });

  return diversify(scored, options.limit ?? 18).map(({ row, score }) => ({
    ...mapContentToItem(row),
    matchScore: toMatch(score),
    reason: explainContent(row, v, ctx, similarRow),
  }));
}

export async function rankTracks(
  signals: TasteSignals,
  options: { limit?: number; kinds?: string[]; /** Skip favorites and heavily played tracks. */ excludeKnown?: boolean } = {},
): Promise<MusicTrack[]> {
  const catalog = await loadTasteCatalog();
  const v = buildVector(signals, catalog.content);
  const ctx = await musicContext(signals, catalog);
  const known = (slug: string) => signals.favoriteTracks.has(slug) || (signals.listened.get(slug) ?? 0) > 0.6;
  const pool = catalog.tracks.filter(
    (row) => (!options.kinds || options.kinds.includes(row.kind)) && !(options.excludeKnown && known(row.slug)),
  );
  const semantic = semanticScores(pool, ctx.trackVector, ctx.profile);
  const collab = collabScores(ctx.collab);
  return pool
    .map((row) => ({ row, score: blendScore(scoreTrackRow(row, v, signals), semantic.get(row.slug), collab(row.slug)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 18)
    .map(({ row, score }) => ({
      ...mapTrackToMusicTrack(row),
      matchScore: toMatch(score),
      reason: explainTrack(row, v, ctx),
    }));
}

export async function rankArtists(
  signals: TasteSignals,
  options: { limit?: number; /** Skip artists the user follows or picked. */ excludeKnown?: boolean } = {},
): Promise<ContentItem[]> {
  const catalog = await loadTasteCatalog();
  const v = buildVector(signals, catalog.content);
  const ctx = await musicContext(signals, catalog);
  const pool = catalog.artists.filter((row) => !(options.excludeKnown && v.artists.has(row.slug)));
  const semantic = semanticScores(pool, ctx.artistVector, ctx.profile);
  return pool
    .map((row) => ({ row, score: blendScore(scoreArtistRow(row, v), semantic.get(row.slug), undefined) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 12)
    .map(({ row, score }) => ({
      ...mapArtistToContentItem(row),
      matchScore: toMatch(score),
      reason: explainArtist(row, v, ctx),
    }));
}

/** Where the user sits in embedding space, for content and for music (null without embeddings). */
export async function tasteCentroids(signals: TasteSignals) {
  const catalog = await loadTasteCatalog();
  const [content, music] = await Promise.all([contentContext(signals, catalog.content), musicContext(signals, catalog)]);
  return { content: content.profile, music: music.profile };
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
