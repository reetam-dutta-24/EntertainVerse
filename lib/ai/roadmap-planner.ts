import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { activeProviderLabel, generateStructured, isAiConfigured } from "@/lib/ai/provider";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import { describeListenPrefs, describeWatchPrefs, type ListenPrefs, type WatchPrefs } from "@/lib/ai-profile/schema";
import { VOCAB } from "@/lib/ai-profile/vocabulary";
import { episodeMinutes, fullRuntime, isFilmType } from "@/lib/roadmap/runtime";
import type { RoadmapAnalysis, RoadmapStepKind } from "@/lib/roadmap/types";
import {
  loadTasteCatalog,
  rankArtists,
  rankContent,
  rankTracks,
  topGenres,
  genreLabel,
  type TasteSignals,
} from "@/lib/services/taste-engine.service";

/** A step before it is saved: item, scope, time, and the model's reason. */
export interface DraftStep {
  kind: RoadmapStepKind;
  itemId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  focus: string;
  why: string;
  estMinutes: number;
  phase: string;
}

export interface RoadmapDraft {
  title: string;
  analysis: RoadmapAnalysis;
  steps: DraftStep[];
  aiWritten: boolean;
}

interface Candidate {
  /** Catalog slug — the only ids the model may pick. */
  id: string;
  kind: RoadmapStepKind;
  itemId: string;
  title: string;
  imageUrl?: string;
  /** Facts the model sees. */
  facts: Record<string, unknown>;
  reason: string;
  full: { focus: string; minutes: number };
  /** Long series: just the first season. */
  firstSeason?: { focus: string; minutes: number };
}

export interface PlannerInput {
  mode: "watch" | "listen";
  signals: TasteSignals;
  watch: WatchPrefs;
  listen: ListenPrefs;
  /** Adjust-chat request, e.g. "make it shorter". */
  instruction?: string;
  /** Steps already done — kept, never re-picked. */
  keepSlugs: string[];
  /** Dropped or swapped-out items — never re-picked. */
  avoidSlugs: string[];
  report: ProgressReporter;
}

async function watchCandidates(input: PlannerInput): Promise<Candidate[]> {
  const exclude = new Set([...input.keepSlugs, ...input.avoidSlugs]);
  const [ranked, catalog] = await Promise.all([
    rankContent(input.signals, { limit: 36, excludeKnown: true, exclude }),
    loadTasteCatalog(),
  ]);
  const rows = new Map(catalog.content.map((row) => [row.slug, row]));
  const ids = ranked.flatMap((item) => rows.get(item.id)?.id ?? []);
  const seasons = await prisma.contentSeason.findMany({
    where: { contentId: { in: ids } },
    orderBy: { position: "asc" },
    select: { contentId: true, label: true, episodeCount: true },
  });
  const firstSeason = new Map<string, { label: string; episodeCount: number }>();
  for (const season of seasons) if (!firstSeason.has(season.contentId)) firstSeason.set(season.contentId, season);

  return ranked.flatMap((item) => {
    const row = rows.get(item.id);
    if (!row) return [];
    const film = isFilmType(row.type);
    const minutes = fullRuntime(row);
    const perEpisode = episodeMinutes(row);
    const season = firstSeason.get(row.id);
    const seasonEpisodes = season?.episodeCount || (row.seasonCount ? Math.round((row.episodeCount ?? 0) / row.seasonCount) : 0);
    const hasSeasons = !film && (row.seasonCount ?? 1) > 1 && seasonEpisodes > 0;
    return [
      {
        id: row.slug,
        kind: "content" as const,
        itemId: row.id,
        title: row.title,
        imageUrl: row.imageUrl ?? undefined,
        reason: item.reason ?? "",
        facts: {
          type: row.type.toLowerCase(),
          genres: row.genres.map((g) => g.genre.label),
          rating: row.rating,
          year: row.year,
          totalHours: Math.round(minutes / 6) / 10,
          episodes: film ? undefined : row.episodeCount,
          seasons: film ? undefined : row.seasonCount,
          about: (row.description ?? "").slice(0, 160),
        },
        full: { focus: film ? "Feature film" : `${row.episodeCount ?? "?"} episodes`, minutes },
        firstSeason: hasSeasons
          ? { focus: `${season?.label || "Season 1"} · ${seasonEpisodes} episodes`, minutes: seasonEpisodes * perEpisode }
          : undefined,
      },
    ];
  });
}

async function listenCandidates(input: PlannerInput): Promise<Candidate[]> {
  const [tracks, artists, catalog] = await Promise.all([
    rankTracks(input.signals, { limit: 28, excludeKnown: true }),
    rankArtists(input.signals, { limit: 8, excludeKnown: true }),
    loadTasteCatalog(),
  ]);
  const trackRows = new Map(catalog.tracks.map((row) => [row.slug, row]));
  const artistRows = new Map(catalog.artists.map((row) => [row.slug, row]));
  const skip = new Set([...input.keepSlugs, ...input.avoidSlugs]);
  return [
    ...tracks.flatMap((track) => {
      const row = trackRows.get(track.id);
      if (!row || skip.has(row.slug)) return [];
      return [
        {
          id: row.slug,
          kind: "track" as const,
          itemId: row.id,
          title: `${row.title} — ${row.artist}`,
          imageUrl: row.imageUrl ?? undefined,
          reason: track.reason ?? "",
          facts: { kind: row.kind, artist: row.artist, genres: row.genres, language: row.language, year: row.year },
          full: { focus: row.kind === "ost" ? "OST" : "Song", minutes: Math.max(2, Math.round((row.durationSeconds ?? 210) / 60)) },
        },
      ];
    }),
    ...artists.flatMap((artist) => {
      const row = artistRows.get(artist.id);
      if (!row || skip.has(row.slug)) return [];
      return [
        {
          id: `artist:${row.slug}`,
          kind: "artist" as const,
          itemId: row.id,
          title: row.title,
          imageUrl: row.imageUrl ?? undefined,
          reason: artist.reason ?? "",
          facts: { kind: "artist", genres: row.genres, languages: row.languages, group: row.isGroup },
          full: { focus: "Explore their top songs", minutes: 20 },
        },
      ];
    }),
  ];
}

const STYLE = `You are EntertainVerse's AI mode. You build a personal ROADMAP — an ordered plan of what to watch or listen to next — so the user stops scrolling and starts enjoying. You only choose from the candidate list (real catalog items); never invent titles.

Write like a thoughtful friend who knows their taste, not a marketer:
- title: short and personal, e.g. "Cozy found-family anime, slow-burn first".
- analysis.headline: one sentence on what their taste is really about.
- analysis.paragraphs: 2-3 short paragraphs (max 80 words each) — what draws them in (tone, pacing, themes), what they might be missing, and how this plan is built. Specific, warm, no clichés, no spoilers.
- analysis.strengths: 3-4 short taste-trait chips, e.g. "Loves slow emotional payoffs".
- analysis.tips: 2-3 practical tips for following the plan.
- phases: 2-4 phases in order (e.g. "Ease in", "Go deeper", "Stretch your taste"), 6-9 steps in total. Start accessible, build toward what they'll love most, end with one stretch pick. Respect their time budget and things to avoid.
- why: 1-2 sentences per step — why this, why here, and how it connects to the previous step or their taste. Spoiler-free.
- scope (watch only): "first-season" for long series when they want short commitments or the budget is tight; otherwise "full".`;

function profileText(input: PlannerInput) {
  if (input.mode === "watch") {
    const archetype = input.watch.archetype ? VOCAB.archetypes.get(input.watch.archetype) : undefined;
    return [
      describeWatchPrefs(input.watch) || "No AI-mode answers yet.",
      archetype ? `Viewer personality: ${archetype.label} — ${archetype.phrase}.` : "",
      `Time budget: ${input.watch.weeklyHours ? `${input.watch.weeklyHours} hours per week` : "not given (assume about 6 hours per week)"}.`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return describeListenPrefs(input.listen) || "No AI-mode answers yet.";
}

async function historyText(input: PlannerInput, catalogTitles: Map<string, string>) {
  const genres = (await topGenres(input.signals, 4)).map((id) => genreLabel(id).label);
  const title = (slug: string) => catalogTitles.get(slug) ?? slug;
  const watched = [...input.signals.watched].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([slug]) => title(slug));
  const loved = [...input.signals.favoriteContent].slice(0, 8).map(title);
  return [
    `Top genres: ${genres.join(", ") || "unknown"}.`,
    loved.length ? `Loved: ${loved.join(", ")}.` : "",
    watched.length ? `Watched recently: ${watched.join(", ")}.` : "",
    input.signals.followedArtists.size ? `Follows artists: ${[...input.signals.followedArtists].slice(0, 8).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Plan without the model (quota or outage): recommender order, recommender reasons. */
function fallbackDraft(input: PlannerInput, candidates: Candidate[]): RoadmapDraft {
  const picks = candidates.slice(0, input.mode === "watch" ? 7 : 9);
  const phases = ["Start here", "Go deeper", "Stretch your taste"];
  const vibes = input.watch.vibes.map((id) => VOCAB.vibes.get(id)?.label).filter(Boolean);
  return {
    title: input.mode === "watch" ? "Your next watches, in order" : "Your listening journey",
    aiWritten: false,
    analysis: {
      headline: vibes.length ? `Built around what you asked for: ${vibes.join(", ").toLowerCase()}.` : "Built from your favorites, history and answers.",
      paragraphs: [
        "The AI writer is busy right now, so this plan comes straight from the recommender: the closest matches to your taste first, then a few that widen it. Each step says why it was picked.",
      ],
      strengths: [],
      tips: ["Regenerate later for a fully written plan."],
    },
    steps: picks.map((candidate, index) => ({
      kind: candidate.kind,
      itemId: candidate.itemId,
      slug: candidate.id.replace(/^artist:/, ""),
      title: candidate.title,
      imageUrl: candidate.imageUrl,
      focus: (input.watch.commitment === "bite-size" && candidate.firstSeason) ? candidate.firstSeason.focus : candidate.full.focus,
      estMinutes: (input.watch.commitment === "bite-size" && candidate.firstSeason) ? candidate.firstSeason.minutes : candidate.full.minutes,
      why: candidate.reason || "A close match to your taste.",
      phase: phases[Math.min(phases.length - 1, Math.floor((index / picks.length) * phases.length))]!,
    })),
  };
}

export async function planRoadmap(input: PlannerInput): Promise<RoadmapDraft> {
  input.report({ label: "Reading your taste profile and history", percent: 5, ceiling: 14 });
  const candidates = input.mode === "watch" ? await watchCandidates(input) : await listenCandidates(input);
  if (candidates.length < 3) throw new Error("Not enough new titles in the catalog to build a roadmap yet.");
  if (!isAiConfigured()) return fallbackDraft(input, candidates);

  const catalog = await loadTasteCatalog();
  const titles = new Map(catalog.content.map((row) => [row.slug, row.title]));
  const ids = candidates.map((c) => c.id) as [string, ...string[]];
  const schema = z.object({
    title: z.string(),
    analysis: z.object({
      headline: z.string(),
      paragraphs: z.array(z.string()),
      strengths: z.array(z.string()),
      tips: z.array(z.string()),
    }),
    phases: z.array(
      z.object({
        name: z.string(),
        steps: z.array(z.object({ id: z.enum(ids), scope: z.enum(["full", "first-season"]), why: z.string() })),
      }),
    ),
  });

  input.report({ label: `Writing your analysis and roadmap with ${activeProviderLabel()}`, percent: 16, ceiling: 90 });
  let out: z.infer<typeof schema>;
  try {
    out = await generateStructured({
      system: STYLE,
      schema,
      prompt:
        `Mode: ${input.mode === "watch" ? "WATCH (anime, shows, K-dramas, films)" : "LISTEN (songs, OSTs, artists)"}\n\n` +
        `What they told AI mode:\n${profileText(input)}\n\nTheir history:\n${await historyText(input, titles)}\n\n` +
        (input.instruction ? `They asked to adjust the plan: "${input.instruction}"\n\n` : "") +
        `Candidates (id: title — facts — recommender's note):\n` +
        candidates.map((c) => `${c.id}: ${c.title} — ${JSON.stringify(c.facts)} — ${c.reason}${c.firstSeason ? ` — first season ≈ ${Math.round(c.firstSeason.minutes / 6) / 10} h` : ""}`).join("\n"),
    });
  } catch (error) {
    console.error("[roadmap] model unavailable, using recommender plan", error);
    return fallbackDraft(input, candidates);
  }

  input.report({ label: "Fitting it into your week", percent: 92, ceiling: 98 });
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const steps: DraftStep[] = [];
  for (const phase of out.phases) {
    for (const step of phase.steps) {
      const candidate = byId.get(step.id);
      if (!candidate || seen.has(step.id) || steps.length >= 10) continue;
      seen.add(step.id);
      const scoped = step.scope === "first-season" && candidate.firstSeason ? candidate.firstSeason : candidate.full;
      steps.push({
        kind: candidate.kind,
        itemId: candidate.itemId,
        slug: candidate.id.replace(/^artist:/, ""),
        title: candidate.title,
        imageUrl: candidate.imageUrl,
        focus: scoped.focus,
        estMinutes: scoped.minutes,
        why: step.why.trim() || candidate.reason,
        phase: phase.name.trim() || "Next up",
      });
    }
  }
  if (steps.length < 3) return fallbackDraft(input, candidates);

  return {
    title: out.title.trim() || "Your roadmap",
    aiWritten: true,
    analysis: {
      headline: out.analysis.headline.trim(),
      paragraphs: out.analysis.paragraphs.map((p) => p.trim()).filter(Boolean).slice(0, 3),
      strengths: out.analysis.strengths.map((s) => s.trim()).filter(Boolean).slice(0, 4),
      tips: out.analysis.tips.map((t) => t.trim()).filter(Boolean).slice(0, 3),
    },
    steps,
  };
}
