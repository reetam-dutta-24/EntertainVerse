import "server-only";

import { prisma } from "@/lib/prisma";
import { geminiEmbed, isGeminiConfigured } from "@/lib/ai/providers/gemini";
import {
  describeListenPrefs,
  describeWatchPrefs,
  hasListenPrefs,
  hasWatchPrefs,
  parseListenPrefs,
  parseWatchPrefs,
  type ListenPrefs,
  type WatchPrefs,
} from "@/lib/ai-profile/schema";
import { LISTEN_MOODS, WATCH_THEMES, WATCH_VIBES } from "@/lib/ai-profile/vocabulary";
import { dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import { minMax } from "@/lib/recommender/hybrid";
import { genreLabel, loadTasteCatalog, loadTasteSignals, tasteCentroids, topGenres } from "@/lib/services/taste-engine.service";

export const EMBEDDING_DIMENSIONS = 768;

export interface AiProfile {
  exists: boolean;
  learnFromActivity: boolean;
  watch: WatchPrefs;
  listen: ListenPrefs;
  updatedAt: string | null;
}

export async function getAiProfile(userId: string): Promise<AiProfile> {
  const row = await prisma.aiTasteProfile.findUnique({ where: { userId } });
  return {
    exists: Boolean(row),
    learnFromActivity: row?.learnFromActivity ?? true,
    watch: parseWatchPrefs(row?.watch),
    listen: parseListenPrefs(row?.listen),
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

/** The answers as a "taste query" vector — lets brand-new users get personal picks. */
async function embedAnswers(text: string): Promise<number[]> {
  if (!text.trim() || !isGeminiConfigured()) return [];
  try {
    const [vector] = await geminiEmbed([text], "RETRIEVAL_QUERY", EMBEDDING_DIMENSIONS);
    return vector ?? [];
  } catch (error) {
    // Answers are still saved and used for genre matching; the vector can be rebuilt later.
    console.error("[ai-profile] embedding failed", error);
    return [];
  }
}

export interface AiProfileUpdate {
  watch?: WatchPrefs;
  listen?: ListenPrefs;
  learnFromActivity?: boolean;
}

export async function saveAiProfile(userId: string, update: AiProfileUpdate): Promise<AiProfile> {
  const [watchVector, listenVector] = await Promise.all([
    update.watch ? embedAnswers(hasWatchPrefs(update.watch) ? describeWatchPrefs(update.watch) : "") : undefined,
    update.listen ? embedAnswers(hasListenPrefs(update.listen) ? describeListenPrefs(update.listen) : "") : undefined,
  ]);
  const data = {
    ...(update.watch ? { watch: update.watch, watchVector } : {}),
    ...(update.listen ? { listen: update.listen, listenVector } : {}),
    ...(update.learnFromActivity !== undefined ? { learnFromActivity: update.learnFromActivity } : {}),
  };
  await prisma.aiTasteProfile.upsert({
    where: { userId },
    create: { userId, watchVector: [], listenVector: [], ...data },
    update: data,
  });
  return getAiProfile(userId);
}

/** Forget every AI-mode answer and setting. Watch/listen history itself is kept (it powers Continue Watching). */
export async function wipeAiProfile(userId: string) {
  await prisma.$transaction([
    prisma.aiTasteProfile.deleteMany({ where: { userId } }),
    // Unsaved collection ideas were built from what it learned — forget them too.
    prisma.aiCollectionSuggestion.deleteMany({ where: { userId, status: "PENDING" } }),
  ]);
}

// ---- insights for the AI profile page ------------------------------------------------------

export interface TraitScore {
  id: string;
  label: string;
  emoji: string;
  /** 0–100 for the bar. */
  score: number;
}

export interface AiProfileInsights {
  watchTraits: TraitScore[];
  listenTraits: TraitScore[];
  topGenres: { id: string; label: string; emoji: string }[];
  mostWatched: { slug: string; title: string }[];
  mostPlayed: { slug: string; title: string; artist: string }[];
  followedArtists: { slug: string; title: string }[];
  favoritesCount: number;
  /** How far back watch/listen history is read. */
  historyDays: number;
  embeddingsReady: boolean;
}

function rankTraits(centroid: Vector | null, vocab: readonly { id: string; label: string; emoji: string }[], prefix: string, vectors: Map<string, Vector>) {
  if (!centroid) return [];
  const raw = new Map<string, number>();
  for (const option of vocab) {
    const vector = vectors.get(embeddingKey("trait", `${prefix}:${option.id}`));
    if (vector) raw.set(option.id, dot(vector, centroid));
  }
  const scaled = minMax(raw);
  return vocab
    .filter((option) => scaled.has(option.id))
    .map((option) => ({ id: option.id, label: option.label, emoji: option.emoji, score: Math.round(40 + 55 * scaled.get(option.id)!) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/** What the recommender has learned, in plain terms. */
export async function getAiProfileInsights(userId: string): Promise<AiProfileInsights> {
  const [signals, catalog, index] = await Promise.all([loadTasteSignals(userId), loadTasteCatalog(), loadEmbeddingIndex()]);
  const centroids = await tasteCentroids(signals);
  const genres = await topGenres(signals, 4);

  const contentBySlug = new Map(catalog.content.map((row) => [row.slug, row]));
  const trackBySlug = new Map(catalog.tracks.map((row) => [row.slug, row]));
  const artistBySlug = new Map(catalog.artists.map((row) => [row.slug, row]));
  const top = (weights: Map<string, number>, count: number) =>
    [...weights].sort((a, b) => b[1] - a[1]).slice(0, count).map(([slug]) => slug);

  return {
    watchTraits: rankTraits(centroids.content, [...WATCH_VIBES, ...WATCH_THEMES], "watch", index.vectors),
    listenTraits: rankTraits(centroids.music, LISTEN_MOODS, "listen", index.vectors),
    topGenres: genres.map((id) => ({ id, ...genreLabel(id) })),
    mostWatched: top(signals.watched, 5).flatMap((slug) => {
      const row = contentBySlug.get(slug);
      return row ? [{ slug, title: row.title }] : [];
    }),
    mostPlayed: top(signals.listened, 5).flatMap((slug) => {
      const row = trackBySlug.get(slug);
      return row ? [{ slug, title: row.title, artist: row.artist }] : [];
    }),
    followedArtists: [...signals.followedArtists].flatMap((slug) => {
      const row = artistBySlug.get(slug);
      return row ? [{ slug, title: row.title }] : [];
    }),
    favoritesCount: signals.favoriteContent.size + signals.favoriteTracks.size,
    historyDays: 180,
    embeddingsReady: index.size > 0,
  };
}

/** Everything the AI uses about this user, for the "Download my AI data" button. */
export async function exportAiProfile(userId: string) {
  const [profile, insights] = await Promise.all([getAiProfile(userId), getAiProfileInsights(userId)]);
  return {
    exportedAt: new Date().toISOString(),
    note: "Everything EntertainVerse's recommender uses about you. Watch/listen history is summarised; full history is on your profile.",
    controls: { learnFromActivity: profile.learnFromActivity },
    answers: { watch: profile.watch, listen: profile.listen },
    learned: insights,
  };
}
