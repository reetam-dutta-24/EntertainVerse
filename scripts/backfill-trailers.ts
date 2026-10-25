/**
 * Link catalog titles to TMDB and save their official trailers.
 * Fills Content.tmdbId / tmdbKind (which also turns on "where to watch") and
 * Content.trailerUrl for titles that don't have them yet. Safe to re-run.
 *
 *   npm run backfill:trailers
 */
import { prisma } from "@/lib/prisma";
import { fetchTmdbTrailer, isTmdbConfigured, searchTmdb } from "@/lib/catalog-import/sources/tmdb";

const norm = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

async function main() {
  if (!isTmdbConfigured()) {
    console.error("TMDB isn't configured — add TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to .env.local.");
    process.exit(1);
  }
  const titles = await prisma.content.findMany({
    where: { OR: [{ trailerUrl: null }, { tmdbId: null }] },
    select: { id: true, title: true, nativeTitle: true, year: true, type: true, tmdbId: true, tmdbKind: true },
  });
  let linked = 0;
  let trailers = 0;
  for (const title of titles) {
    try {
      let id = title.tmdbId;
      let kind = (title.tmdbKind as "movie" | "tv" | null) ?? null;
      if (!id) {
        const wantKind = title.type === "MOVIE" ? "movie" : "tv";
        const hits = await searchTmdb(title.title);
        // Same name (or native name), right kind, year within one.
        const match =
          hits.find((hit) => hit.tmdbKind === wantKind && (norm(hit.title) === norm(title.title) || (hit.originalTitle && title.nativeTitle && norm(hit.originalTitle) === norm(title.nativeTitle))) && (!title.year || !hit.year || Math.abs(hit.year - title.year) <= 1)) ??
          hits.find((hit) => hit.tmdbKind === wantKind && norm(hit.title) === norm(title.title));
        if (!match) {
          console.log(`  ✗ no confident TMDB match: ${title.title}`);
          continue;
        }
        id = Number(match.sourceId);
        kind = match.tmdbKind ?? wantKind;
        linked++;
      }
      const trailerUrl = await fetchTmdbTrailer(id, kind!);
      if (trailerUrl) trailers++;
      await prisma.content.update({
        where: { id: title.id },
        data: { tmdbId: id, tmdbKind: kind, ...(trailerUrl ? { trailerUrl } : {}) },
      });
      console.log(`  ✓ ${title.title} → TMDB ${kind} #${id}${trailerUrl ? " · trailer" : " · no trailer"}`);
    } catch (error) {
      console.log(`  ! ${title.title}: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`Done — linked ${linked} titles to TMDB, saved ${trailers} trailers (of ${titles.length} checked).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
