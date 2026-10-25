/**
 * Offline evaluation of the recommender (leave-one-out).
 *
 * For every user with at least 3 favorites, each favorite is hidden in turn —
 * removed from favorites, history and watchlist — and each variant ranks the
 * catalog. We record where the hidden favorite lands:
 *
 *   HitRate@K = share of hidden favorites that appear in the top K
 *   MRR@20    = mean of 1/rank (0 when outside the top 20)
 *
 * Variants: popularity (rating) baseline → taste engine only → + semantic
 * embeddings → full hybrid (+ collaborative). Writes docs/recommender-evaluation.md.
 *
 *   npm run eval:recommender
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { loadTasteCatalog, loadTasteSignals, rankContent, rankTracks, type TasteSignals } from "@/lib/services/taste-engine.service";

const K = [10, 20] as const;
type Layers = { semantic?: boolean; collaborative?: boolean };

interface Variant {
  name: string;
  layers?: Layers;
  popularity?: boolean;
}

const VARIANTS: Variant[] = [
  { name: "Popularity (rating) baseline", popularity: true },
  { name: "Taste engine only (genres, types, languages)", layers: { semantic: false, collaborative: false } },
  { name: "+ Semantic embeddings (gemini-embedding-001)", layers: { semantic: true, collaborative: false } },
  { name: "Full hybrid (+ collaborative filtering)", layers: { semantic: true, collaborative: true } },
];

interface Score {
  hits: Record<number, number>;
  rr: number;
  n: number;
}

const empty = (): Score => ({ hits: { 10: 0, 20: 0 }, rr: 0, n: 0 });

function record(score: Score, rank: number) {
  score.n++;
  for (const k of K) if (rank > 0 && rank <= k) score.hits[k]!++;
  if (rank > 0 && rank <= 20) score.rr += 1 / rank;
}

/** Signals with one favorite hidden everywhere the engine could see it. */
function hideContent(signals: TasteSignals, slug: string): TasteSignals {
  const favoriteContent = new Set(signals.favoriteContent);
  favoriteContent.delete(slug);
  const watchlist = new Set(signals.watchlist);
  watchlist.delete(slug);
  const watched = new Map(signals.watched);
  watched.delete(slug);
  return {
    ...signals,
    favoriteContent,
    watchlist,
    watched,
    selection: { ...signals.selection, favoriteTitles: signals.selection.favoriteTitles.filter((s) => s !== slug) },
  };
}

function hideTrack(signals: TasteSignals, slug: string): TasteSignals {
  const favoriteTracks = new Set(signals.favoriteTracks);
  favoriteTracks.delete(slug);
  const listened = new Map(signals.listened);
  listened.delete(slug);
  return { ...signals, favoriteTracks, listened };
}

async function main() {
  const catalog = await loadTasteCatalog();
  const users = await prisma.user.findMany({ select: { id: true } });
  const content = new Map(VARIANTS.map((v) => [v.name, empty()]));
  const tracks = new Map(VARIANTS.map((v) => [v.name, empty()]));
  let contentUsers = 0;
  let trackUsers = 0;

  for (const user of users) {
    const signals = await loadTasteSignals(user.id);

    if (signals.favoriteContent.size >= 3) {
      contentUsers++;
      for (const hidden of signals.favoriteContent) {
        const masked = hideContent(signals, hidden);
        const known = new Set([...masked.favoriteContent, ...masked.watchlist, ...masked.watched.keys()]);
        for (const variant of VARIANTS) {
          const ranked = variant.popularity
            ? catalog.content.filter((row) => !known.has(row.slug)).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 20).map((row) => row.slug)
            : (await rankContent(masked, { limit: 20, excludeKnown: true, layers: variant.layers })).map((item) => item.id);
          record(content.get(variant.name)!, ranked.indexOf(hidden) + 1);
        }
      }
    }

    if (signals.favoriteTracks.size >= 3) {
      trackUsers++;
      for (const hidden of signals.favoriteTracks) {
        const masked = hideTrack(signals, hidden);
        for (const variant of VARIANTS) {
          const ranked = variant.popularity
            ? catalog.tracks
                .filter((row) => !masked.favoriteTracks.has(row.slug))
                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                .slice(0, 20)
                .map((row) => row.slug)
            : (await rankTracks(masked, { limit: 20, excludeKnown: true, layers: variant.layers })).map((track) => track.id);
          record(tracks.get(variant.name)!, ranked.indexOf(hidden) + 1);
        }
      }
    }
  }

  const pct = (value: number, n: number) => (n ? `${((value / n) * 100).toFixed(1)}%` : "—");
  const table = (scores: Map<string, Score>) =>
    [
      "| Variant | HitRate@10 | HitRate@20 | MRR@20 |",
      "| --- | ---: | ---: | ---: |",
      ...VARIANTS.map((v) => {
        const s = scores.get(v.name)!;
        return `| ${v.name} | ${pct(s.hits[10]!, s.n)} | ${pct(s.hits[20]!, s.n)} | ${s.n ? (s.rr / s.n).toFixed(3) : "—"} |`;
      }),
    ].join("\n");

  const contentN = content.get(VARIANTS[0]!.name)!.n;
  const trackN = tracks.get(VARIANTS[0]!.name)!.n;
  const report = `# Recommender evaluation

Generated ${new Date().toISOString().slice(0, 10)} by \`npm run eval:recommender\` (leave-one-out).

**Method.** For every user with at least 3 favorites, each favorite is hidden in turn — removed
from favorites, watch history and watchlist — and every variant ranks the whole catalog (minus
what the user already knows). HitRate@K is the share of hidden favorites found in the top K;
MRR@20 is the mean reciprocal rank (0 outside the top 20). Collaborative signals always exclude
the user being evaluated.

**Catalog:** ${catalog.content.length} titles, ${catalog.tracks.length} tracks. **Caveat:** the dataset is small
(seeded demo users), so treat differences of a few points as noise.

## Titles (${contentN} hidden favorites across ${contentUsers} users)

${table(content)}

## Music (${trackN} hidden favorites across ${trackUsers} users)

${table(tracks)}
`;
  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/recommender-evaluation.md", report);
  console.log(report);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
