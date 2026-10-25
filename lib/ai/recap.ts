import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { activeProviderLabel, generateStructured, researchWithWeb } from "@/lib/ai/provider";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import { episodeMinutes, fullRuntime, isFilmType } from "@/lib/roadmap/runtime";
import type { RecapDepth, RecapOptions, RecapResult } from "@/lib/recap/types";

/**
 * "Catch me up" — retrieval-augmented recaps. We first retrieve what's known about
 * exactly the part the user has seen (AniVerse's own episode descriptions; web search
 * limited to that point when the catalog has none), then the model writes a recap
 * grounded only in that text and never past the stopping point. Recaps are cached
 * and shared per title / stopping point / depth.
 */

const recapSchema = z.object({
  headline: z.string(),
  beats: z.array(z.string()),
  characters: z.array(z.object({ name: z.string(), note: z.string() })),
  leftOff: z.string(),
  watchFor: z.string(),
});

const BEATS: Record<RecapDepth, string> = {
  quick: "3-4 beats focused on the most recent stretch before the stopping point",
  standard: "5-7 beats covering the whole story so far",
  detailed: "8-10 beats covering the whole story so far, plus who everyone is",
};

async function loadTitle(slug: string) {
  return prisma.content.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      synopsis: true,
      description: true,
      year: true,
      episodeDuration: true,
      episodeCount: true,
      seasonCount: true,
      seasons: { orderBy: { position: "asc" }, select: { label: true, episodeCount: true } },
      characters: { orderBy: { position: "asc" }, take: 12, select: { name: true, role: true } },
    },
  });
}

type TitleRow = NonNullable<Awaited<ReturnType<typeof loadTitle>>>;

function seasonsOf(row: TitleRow) {
  if (row.seasons.length) {
    return row.seasons.map((season, index) => ({ number: index + 1, label: season.label || `Season ${index + 1}`, episodes: Math.max(1, season.episodeCount) }));
  }
  const count = Math.max(1, row.seasonCount ?? 1);
  const perSeason = Math.max(1, Math.round((row.episodeCount ?? 12) / count));
  return Array.from({ length: count }, (_, index) => ({ number: index + 1, label: `Season ${index + 1}`, episodes: perSeason }));
}

/** What to ask, plus a best guess of where they stopped (from minutes watched). */
export async function getRecapOptions(userId: string, slug: string): Promise<RecapOptions | null> {
  const row = await loadTitle(slug);
  if (!row) return null;
  const watched = await prisma.watchEvent.aggregate({ where: { userId, contentId: row.id }, _sum: { minutes: true } });
  const watchedMinutes = watched._sum.minutes ?? 0;
  const film = isFilmType(row.type);
  if (film) {
    const runtime = fullRuntime(row);
    const percent = watchedMinutes ? Math.min(90, Math.max(10, Math.round(((watchedMinutes % runtime) / runtime) * 100 / 10) * 10)) : null;
    return { title: row.title, kind: "film", seasons: [], guess: percent ? { percent } : null, watchedMinutes };
  }
  const seasons = seasonsOf(row);
  let guess: RecapOptions["guess"] = null;
  if (watchedMinutes) {
    let episodesSeen = Math.max(1, Math.round(watchedMinutes / episodeMinutes(row)));
    for (const season of seasons) {
      if (episodesSeen <= season.episodes) {
        guess = { season: season.number, episode: episodesSeen };
        break;
      }
      episodesSeen -= season.episodes;
    }
    guess ??= { season: seasons.at(-1)!.number, episode: seasons.at(-1)!.episodes };
  }
  return { title: row.title, kind: "series", seasons, guess, watchedMinutes };
}

export interface RecapRequest {
  season?: number;
  episode?: number;
  percent?: number;
  depth: RecapDepth;
}

export async function generateRecap(slug: string, request: RecapRequest, report: ProgressReporter = () => {}): Promise<RecapResult> {
  const row = await loadTitle(slug);
  if (!row) throw new Error("Title not found.");
  const film = isFilmType(row.type);
  const season = Math.max(1, Math.round(request.season ?? 1));
  const episode = Math.max(1, Math.round(request.episode ?? 1));
  const percent = Math.max(5, Math.min(100, Math.round(request.percent ?? 50)));
  const upTo = film ? `film-${percent}` : `s${season}e${episode}`;
  const upToLabel = film ? (percent >= 100 ? "the whole film" : `about ${percent}% into the film`) : `Season ${season}, Episode ${episode}`;

  report({ label: "Checking for a saved recap", percent: 3, ceiling: 8 });
  const cached = await prisma.aiRecap.findUnique({ where: { contentId_upTo_depth: { contentId: row.id, upTo, depth: request.depth } } });
  if (cached) {
    const payload = cached.payload as unknown as z.infer<typeof recapSchema>;
    return { title: row.title, upToLabel, ...payload, sources: (cached.sources as RecapResult["sources"]) ?? [], grounding: cached.grounding as RecapResult["grounding"], cached: true };
  }

  // ---- Retrieve -------------------------------------------------------------------------
  report({ label: `Retrieving what happens up to ${upToLabel}`, percent: 10, ceiling: 40 });
  let grounding: RecapResult["grounding"] = "synopsis";
  let context = "";
  let sources: RecapResult["sources"] = [];
  if (!film) {
    const episodes = await prisma.contentEpisode.findMany({
      where: { contentId: row.id, OR: [{ seasonNumber: { lt: season } }, { seasonNumber: season, number: { lte: episode } }] },
      orderBy: [{ seasonNumber: "asc" }, { number: "asc" }],
      select: { seasonNumber: true, number: true, title: true, description: true },
    });
    const described = episodes.filter((entry) => entry.description?.trim());
    // Catalog episodes cover the stopping point — ground in them.
    if (described.length && described.at(-1)!.seasonNumber === season && described.at(-1)!.number === episode) {
      grounding = "episodes";
      context = described.map((entry) => `S${entry.seasonNumber}E${entry.number} "${entry.title}": ${entry.description}`).join("\n");
    }
  }
  if (grounding !== "episodes") {
    try {
      const research = await researchWithWeb(
        `Summarise the plot of ${film ? "the film" : "the series"} "${row.title}"${row.year ? ` (${row.year})` : ""} ` +
          (film ? `from the beginning up to about ${percent}% of its runtime.` : `from the first episode up to and including Season ${season}, Episode ${episode}.`) +
          " Cover the main events in order and the main characters. Do NOT describe anything that happens after that point — stop exactly there.",
        { tier: "fast" },
      );
      grounding = "web";
      context = research.factSheet;
      sources = research.sources.slice(0, 6);
    } catch {
      context = [row.synopsis, row.description].filter(Boolean).join("\n");
    }
  }
  if (!context.trim()) throw new Error("There isn't enough information about this title to write a recap yet.");

  // ---- Generate --------------------------------------------------------------------------
  report({ label: `Writing your recap with ${activeProviderLabel()}`, percent: 45, ceiling: 95 });
  const out = await generateStructured({
    tier: "fast",
    schema: recapSchema,
    system:
      "You write spoiler-safe 'previously on' recaps for someone returning to a show or film. STRICT RULES: " +
      "describe only events up to and including the stopping point; if the source mentions anything later, ignore it completely; " +
      "never hint at future twists, deaths or reveals; use only the provided source text (no outside knowledge); " +
      "write clearly in your own words, in past tense, warm and concise.",
    prompt:
      `Title: ${row.title}\nStopping point: ${upToLabel}\nDepth: ${BEATS[request.depth]}.\n` +
      (row.characters.length ? `Known characters: ${row.characters.map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}`).join(", ")}\n` : "") +
      `\nSource (${grounding === "episodes" ? "episode descriptions" : grounding === "web" ? "web research limited to the stopping point" : "series synopsis"}):\n${context}\n\n` +
      "Write: headline (one line, e.g. 'Where we left Light and L'), beats, characters (up to 6 who matter so far, one line each), " +
      "leftOff (where things stand at the stopping point, 1-2 sentences), watchFor (what questions are open going in — no answers, no spoilers).",
  });

  const payload = {
    headline: out.headline.trim(),
    beats: out.beats.map((beat) => beat.trim()).filter(Boolean).slice(0, 10),
    characters: out.characters.slice(0, 6),
    leftOff: out.leftOff.trim(),
    watchFor: out.watchFor.trim(),
  };
  // Synopsis-only recaps are a stopgap — don't cache them, so a grounded one is written next time.
  if (grounding !== "synopsis") {
    await prisma.aiRecap
      .create({
        data: {
          contentId: row.id,
          upTo,
          depth: request.depth,
          payload: payload as unknown as Prisma.InputJsonValue,
          sources: sources as unknown as Prisma.InputJsonValue,
          grounding,
        },
      })
      .catch(() => undefined);
  }
  return { title: row.title, upToLabel, ...payload, sources, grounding, cached: false };
}
