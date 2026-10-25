import { NextResponse } from "next/server";
import { cacheStats } from "@/lib/cache/server-cache";
import { loadInteractionGraph } from "@/lib/recommender/hybrid";
import { loadEmbeddingIndex } from "@/lib/recommender/embeddings";
import { loadTasteCatalog } from "@/lib/services/taste-engine.service";
import { getNewReleases, getTrendingMusic, getTrendingThisWeek } from "@/lib/data/discover";
import { getGlobalCommunities } from "@/lib/data/community";

/**
 * GET /api/internal/warm — fills the shared server cache right after boot, so the first
 * visitor doesn't pay for loading the catalog, embeddings and collaborative graph.
 * Called once by server.ts with a per-boot token; anyone else gets a 404.
 */
export async function GET(request: Request) {
  const token = process.env.CACHE_WARMUP_TOKEN;
  if (!token || request.headers.get("x-warmup-token") !== token) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const started = Date.now();
  await Promise.all([
    loadTasteCatalog(),
    loadEmbeddingIndex(),
    loadInteractionGraph(),
    getTrendingThisWeek(),
    getNewReleases(),
    getTrendingMusic(),
    getGlobalCommunities(),
  ]);
  return NextResponse.json({ ms: Date.now() - started, ...cacheStats() });
}
