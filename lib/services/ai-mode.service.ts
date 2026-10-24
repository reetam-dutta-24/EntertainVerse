import "server-only";

import type { AiMode } from "@/lib/ai-profile/schema";
import { loadTasteSignals, rankArtists, rankContent, rankTracks } from "@/lib/services/taste-engine.service";
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

/** One watch + one listen pick for the home "tonight" card. */
export async function getTonightsPicks(userId: string): Promise<{ watch: ContentItem | null; listen: MusicTrack | null }> {
  const signals = await loadTasteSignals(userId);
  const [[watch], [listen]] = await Promise.all([
    rankContent(signals, { limit: 1, excludeKnown: true }),
    rankTracks(signals, { limit: 1, excludeKnown: true }),
  ]);
  return { watch: watch ?? null, listen: listen ?? null };
}
