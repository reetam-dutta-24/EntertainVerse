import "server-only";

import type { AiMode } from "@/lib/ai-profile/schema";
import type { QuizCatalog } from "@/lib/ai-profile/quiz";
import { loadTasteCatalog, loadTasteSignals, rankArtists, rankContent, rankTracks } from "@/lib/services/taste-engine.service";
import type { ContentItem, MusicTrack } from "@/types";

export interface AiModePicks {
  mode: AiMode;
  content: ContentItem[];
  tracks: MusicTrack[];
  artists: ContentItem[];
}

/** Picks for AI mode results — instant (embeddings + taste engine, no LLM call). */
export async function getAiModePicks(userId: string, mode: AiMode): Promise<AiModePicks> {
  const signals = await loadTasteSignals(userId);
  if (mode === "watch") {
    return { mode, content: await rankContent(signals, { limit: 18, excludeKnown: true }), tracks: [], artists: [] };
  }
  const [tracks, artists] = await Promise.all([
    rankTracks(signals, { limit: 18, excludeKnown: true }),
    rankArtists(signals, { limit: 10, excludeKnown: true }),
  ]);
  return { mode, content: [], tracks, artists };
}

/**
 * Posters and artist photos for the quiz's "which did you love?" cards: well-rated,
 * spread across formats so every kind of viewer recognises something.
 */
export async function getQuizCatalog(): Promise<QuizCatalog> {
  const catalog = await loadTasteCatalog();
  const perType = new Map<string, number>();
  const franchises = new Set<string>();
  const titles = catalog.content
    .filter((row) => row.imageUrl)
    .filter((row) => {
      // One title per franchise ("Planet Earth", "Planet Earth II"...), max 4 per format.
      const franchise = row.title.toLowerCase().split(/[\s:]+/).slice(0, 2).join(" ");
      const count = perType.get(row.type) ?? 0;
      if (count >= 4 || franchises.has(franchise)) return false;
      franchises.add(franchise);
      perType.set(row.type, count + 1);
      return true;
    })
    .slice(0, 18)
    .map((row) => ({ id: row.slug, label: row.title, emoji: "🎬", phrase: row.title, imageUrl: row.imageUrl ?? undefined }));
  const artists = catalog.artists
    .filter((row) => row.imageUrl)
    .slice(0, 12)
    .map((row) => ({ id: row.slug, label: row.title, emoji: "🎤", phrase: row.title, imageUrl: row.imageUrl ?? undefined }));
  return { titles, artists };
}

/** One watch + one listen pick for the home "tonight" card. */
export async function getTonightsPicks(userId: string): Promise<{ watch: ContentItem | null; listen: MusicTrack | null }> {
  const signals = await loadTasteSignals(userId);
  const [[watch], [listen]] = await Promise.all([
    rankContent(signals, { limit: 1, excludeKnown: true }),
    rankTracks(signals, { limit: 1, excludeKnown: true }),
  ]);
  return { watch: watch ?? null, listen: listen ?? null };
}
