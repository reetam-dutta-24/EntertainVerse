import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import { planRoadmap, type DraftStep } from "@/lib/ai/roadmap-planner";
import { getContentDetailPath } from "@/lib/content-routes";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { getSongDetailPath } from "@/lib/song-routes";
import { episodeMinutes, fullRuntime, isFilmType, scheduleWeeks } from "@/lib/roadmap/runtime";
import type { RoadmapAnalysis, RoadmapStepStatus, RoadmapStepView, RoadmapView } from "@/lib/roadmap/types";
import { getAiProfile } from "@/lib/services/ai-profile.service";
import { loadTasteSignals, rankArtists, rankContent, rankTracks } from "@/lib/services/taste-engine.service";

type Mode = "watch" | "listen";

/** Default pace when the user didn't say how much time they have. */
const DEFAULT_WEEKLY_HOURS: Record<Mode, number> = { watch: 6, listen: 3 };
const STALL_DAYS = 14;

const roadmapInclude = { steps: { orderBy: { position: "asc" } } } satisfies Prisma.AiRoadmapInclude;
type RoadmapRow = Prisma.AiRoadmapGetPayload<{ include: typeof roadmapInclude }>;
type StepRow = RoadmapRow["steps"][number];

function parseAnalysis(value: unknown): RoadmapAnalysis {
  const record = (value ?? {}) as Partial<RoadmapAnalysis>;
  const strings = (list: unknown) => (Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : []);
  return {
    headline: typeof record.headline === "string" ? record.headline : "",
    paragraphs: strings(record.paragraphs),
    strengths: strings(record.strengths),
    tips: strings(record.tips),
  };
}

function hrefFor(step: Pick<StepRow, "kind" | "itemSlug">) {
  if (step.kind === "track") return getSongDetailPath(step.itemSlug);
  if (step.kind === "artist") return getArtistDetailPath(step.itemSlug);
  return getContentDetailPath(step.itemSlug);
}

function toView(row: RoadmapRow): RoadmapView {
  const mode = row.mode as Mode;
  const now = Date.now();
  const steps: RoadmapStepView[] = row.steps.map((step) => ({
    id: step.id,
    position: step.position,
    phase: step.phase,
    kind: step.kind as RoadmapStepView["kind"],
    slug: step.itemSlug,
    title: step.title,
    imageUrl: step.imageUrl ?? undefined,
    focus: step.focus,
    why: step.why,
    estMinutes: step.estMinutes,
    week: step.week,
    status: step.status as RoadmapStepStatus,
    progressMinutes: step.progressMinutes,
    replacedTitle: step.replacedTitle ?? undefined,
    stalled:
      step.status === "IN_PROGRESS" &&
      now - (step.lastActivityAt ?? step.startedAt ?? row.createdAt).getTime() > STALL_DAYS * 86_400_000,
    href: hrefFor(step),
  }));
  const active = steps.filter((step) => step.status !== "DROPPED");
  const totalMinutes = active.reduce((sum, step) => sum + step.estMinutes, 0);
  const doneMinutes = active.reduce(
    (sum, step) => sum + (step.status === "DONE" ? step.estMinutes : Math.min(step.progressMinutes, step.estMinutes)),
    0,
  );
  return {
    id: row.id,
    mode,
    title: row.title,
    analysis: parseAnalysis(row.analysis),
    weeklyHours: row.weeklyHours,
    scheduledHours: row.weeklyHours ?? DEFAULT_WEEKLY_HOURS[mode],
    aiWritten: row.aiWritten,
    createdAt: row.createdAt.toISOString(),
    totalMinutes,
    doneMinutes,
    doneSteps: active.filter((step) => step.status === "DONE").length,
    progressPercent: totalMinutes ? Math.round((doneMinutes / totalMinutes) * 100) : 0,
    weeks: Math.max(1, ...active.map((step) => step.week)),
    steps,
  };
}

/**
 * Watch plans: week numbers from the time budget. Listen plans are short, so
 * their "stages" follow the plan's phases instead.
 */
function weeksFor(mode: Mode, steps: { estMinutes: number; phase: string }[], weeklyHours: number) {
  if (mode === "listen") {
    let stage = 0;
    return steps.map((step, index) => (index === 0 || step.phase !== steps[index - 1]!.phase ? ++stage : stage));
  }
  return scheduleWeeks(
    steps.map((step) => step.estMinutes),
    weeklyHours * 60,
  );
}

async function activeRoadmap(userId: string, mode: Mode) {
  return prisma.aiRoadmap.findFirst({
    where: { userId, mode, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: roadmapInclude,
  });
}

/**
 * Build (or, with an instruction, adjust) the user's roadmap for a mode.
 * Adjusting keeps finished steps and never re-picks dropped ones.
 */
export async function generateRoadmap(
  userId: string,
  mode: Mode,
  options: { instruction?: string } = {},
  report: ProgressReporter = () => {},
): Promise<RoadmapView> {
  const [signals, profile, previous] = await Promise.all([loadTasteSignals(userId), getAiProfile(userId), activeRoadmap(userId, mode)]);
  const kept = previous ? previous.steps.filter((step) => step.status === "DONE" || step.status === "IN_PROGRESS") : [];
  const dropped = previous ? previous.steps.filter((step) => step.status === "DROPPED") : [];

  const draft = await planRoadmap({
    mode,
    signals,
    watch: profile.watch,
    listen: profile.listen,
    instruction: options.instruction,
    keepSlugs: kept.map((step) => step.itemSlug),
    avoidSlugs: dropped.map((step) => step.itemSlug),
    report,
  });

  const weeklyHours = mode === "watch" ? profile.watch.weeklyHours : null;
  const pace = weeklyHours ?? DEFAULT_WEEKLY_HOURS[mode];
  const ordered: (DraftStep & { status?: string; progressMinutes?: number })[] = [
    ...kept.map((step) => ({
      kind: step.kind as DraftStep["kind"],
      itemId: step.itemId,
      slug: step.itemSlug,
      title: step.title,
      imageUrl: step.imageUrl ?? undefined,
      focus: step.focus,
      why: step.why,
      estMinutes: step.estMinutes,
      phase: step.phase,
      status: step.status,
      progressMinutes: step.progressMinutes,
    })),
    ...draft.steps,
  ];
  const weeks = weeksFor(mode, ordered, pace);

  const created = await prisma.$transaction(async (tx) => {
    await tx.aiRoadmap.updateMany({ where: { userId, mode, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
    return tx.aiRoadmap.create({
      data: {
        userId,
        mode,
        title: draft.title,
        analysis: draft.analysis as unknown as Prisma.InputJsonValue,
        weeklyHours,
        aiWritten: draft.aiWritten,
        steps: {
          create: ordered.map((step, index) => ({
            position: index,
            phase: step.phase,
            kind: step.kind,
            itemId: step.itemId,
            itemSlug: step.slug,
            title: step.title,
            imageUrl: step.imageUrl ?? null,
            focus: step.focus,
            why: step.why,
            estMinutes: step.estMinutes,
            week: weeks[index] ?? 1,
            status: step.status ?? "PENDING",
            progressMinutes: step.progressMinutes ?? 0,
          })),
        },
      },
      include: roadmapInclude,
    });
  });
  return toView(created);
}

/**
 * Tick steps off from real activity since the roadmap was made:
 * watched ≥85% of the estimate (or watchlist "completed") → done; watchlist
 * "dropped" → dropped; any watching → in progress. Songs: played → done.
 * Artists: two plays of their songs or a follow → done.
 */
async function syncProgress(userId: string, roadmap: RoadmapRow) {
  const open = roadmap.steps.filter((step) => step.status === "PENDING" || step.status === "IN_PROGRESS");
  if (!open.length) return roadmap;
  const since = roadmap.createdAt;
  const contentIds = open.filter((s) => s.kind === "content").map((s) => s.itemId);
  const trackIds = open.filter((s) => s.kind === "track").map((s) => s.itemId);
  const artistIds = open.filter((s) => s.kind === "artist").map((s) => s.itemId);

  const [watches, watchlist, listens, artistListens, follows] = await Promise.all([
    contentIds.length
      ? prisma.watchEvent.groupBy({ by: ["contentId"], where: { userId, contentId: { in: contentIds }, watchedAt: { gte: since } }, _sum: { minutes: true }, _max: { watchedAt: true } })
      : [],
    contentIds.length ? prisma.watchlistItem.findMany({ where: { userId, contentId: { in: contentIds } }, select: { contentId: true, status: true } }) : [],
    trackIds.length
      ? prisma.listenEvent.groupBy({ by: ["trackId"], where: { userId, trackId: { in: trackIds }, listenedAt: { gte: since } }, _sum: { minutes: true }, _max: { listenedAt: true } })
      : [],
    artistIds.length
      ? prisma.listenEvent.findMany({ where: { userId, listenedAt: { gte: since }, track: { artistId: { in: artistIds } } }, select: { listenedAt: true, track: { select: { artistId: true } } } })
      : [],
    artistIds.length ? prisma.artistFollow.findMany({ where: { userId, artistId: { in: artistIds } }, select: { artistId: true, createdAt: true } }) : [],
  ]);

  const watched = new Map(watches.map((w) => [w.contentId, { minutes: w._sum.minutes ?? 0, at: w._max.watchedAt }]));
  const listStatus = new Map(watchlist.map((w) => [w.contentId, w.status]));
  const played = new Map(listens.map((l) => [l.trackId, { minutes: l._sum.minutes ?? 0, at: l._max.listenedAt }]));
  const artistPlays = new Map<string, { count: number; at: Date }>();
  for (const event of artistListens) {
    const id = event.track.artistId;
    if (!id) continue;
    const current = artistPlays.get(id);
    artistPlays.set(id, { count: (current?.count ?? 0) + 1, at: !current || event.listenedAt > current.at ? event.listenedAt : current.at });
  }
  const followed = new Map(follows.map((f) => [f.artistId, f.createdAt]));

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const now = new Date();
  for (const step of open) {
    let status = step.status;
    let minutes = step.progressMinutes;
    let at: Date | null | undefined = step.lastActivityAt;
    if (step.kind === "content") {
      const activity = watched.get(step.itemId);
      minutes = Math.max(minutes, activity?.minutes ?? 0);
      at = activity?.at ?? at;
      const listed = listStatus.get(step.itemId);
      if (listed === "COMPLETED" || (step.estMinutes && minutes >= step.estMinutes * 0.85)) status = "DONE";
      else if (listed === "DROPPED") status = "DROPPED";
      else if (minutes > 0 || listed === "WATCHING") status = "IN_PROGRESS";
    } else if (step.kind === "track") {
      const activity = played.get(step.itemId);
      if (activity && activity.minutes > 0) {
        status = "DONE";
        minutes = Math.max(minutes, activity.minutes);
        at = activity.at ?? at;
      }
    } else {
      const plays = artistPlays.get(step.itemId);
      const followedAt = followed.get(step.itemId);
      if ((plays?.count ?? 0) >= 2 || (followedAt && followedAt >= since)) status = "DONE";
      else if (plays) status = "IN_PROGRESS";
      at = plays?.at ?? at;
      minutes = Math.min(step.estMinutes, (plays?.count ?? 0) * 4);
    }
    if (status !== step.status || minutes !== step.progressMinutes || at?.getTime() !== step.lastActivityAt?.getTime()) {
      updates.push(
        prisma.aiRoadmapStep.update({
          where: { id: step.id },
          data: {
            status,
            progressMinutes: minutes,
            lastActivityAt: at ?? null,
            startedAt: step.startedAt ?? (status !== "PENDING" ? (at ?? now) : null),
            completedAt: status === "DONE" ? (step.completedAt ?? at ?? now) : null,
          },
        }),
      );
    }
  }
  if (!updates.length) return roadmap;
  await prisma.$transaction(updates);
  return (await activeRoadmap(userId, roadmap.mode as Mode)) ?? roadmap;
}

/** The user's current roadmap for a mode, with progress synced from activity. */
export async function getActiveRoadmapView(userId: string, mode: Mode): Promise<RoadmapView | null> {
  const roadmap = await activeRoadmap(userId, mode);
  if (!roadmap) return null;
  return toView(await syncProgress(userId, roadmap));
}

/** One line for the home spotlight: progress + next step. */
export async function getRoadmapTeaser(userId: string) {
  const view = await getActiveRoadmapView(userId, "watch");
  if (!view) return null;
  const next = view.steps.find((step) => step.status === "IN_PROGRESS") ?? view.steps.find((step) => step.status === "PENDING");
  return { title: view.title, progressPercent: view.progressPercent, doneSteps: view.doneSteps, totalSteps: view.steps.filter((s) => s.status !== "DROPPED").length, next: next ? { title: next.title, href: next.href } : null };
}

async function ownedStep(userId: string, roadmapId: string, stepId: string) {
  const step = await prisma.aiRoadmapStep.findFirst({ where: { id: stepId, roadmapId, roadmap: { userId } }, include: { roadmap: { include: roadmapInclude } } });
  if (!step) throw new RoadmapNotFoundError();
  return step;
}

export class RoadmapNotFoundError extends Error {
  constructor() {
    super("Roadmap step not found.");
    this.name = "RoadmapNotFoundError";
  }
}

async function reschedule(roadmap: RoadmapRow) {
  const pace = roadmap.weeklyHours ?? DEFAULT_WEEKLY_HOURS[roadmap.mode as Mode];
  const live = roadmap.steps.filter((step) => step.status !== "DROPPED");
  const weeks = weeksFor(roadmap.mode as Mode, live, pace);
  await prisma.$transaction(live.map((step, index) => prisma.aiRoadmapStep.update({ where: { id: step.id }, data: { week: weeks[index] ?? 1 } })));
}

/** Manual step actions: mark done, undo, or drop. */
export async function updateRoadmapStep(userId: string, roadmapId: string, stepId: string, action: "done" | "undo" | "drop") {
  const step = await ownedStep(userId, roadmapId, stepId);
  const now = new Date();
  await prisma.aiRoadmapStep.update({
    where: { id: stepId },
    data:
      action === "done"
        ? { status: "DONE", completedAt: now, startedAt: step.startedAt ?? now }
        : action === "drop"
          ? { status: "DROPPED" }
          : { status: step.progressMinutes > 0 ? "IN_PROGRESS" : "PENDING", completedAt: null },
  });
  const roadmap = await activeRoadmap(userId, step.roadmap.mode as Mode);
  if (roadmap) await reschedule(roadmap);
  return getActiveRoadmapView(userId, step.roadmap.mode as Mode);
}

/**
 * Swap a step for the best new match — preferring something similar to what's
 * being replaced, never anything already on the roadmap.
 */
export async function replaceRoadmapStep(userId: string, roadmapId: string, stepId: string) {
  const step = await ownedStep(userId, roadmapId, stepId);
  const signals = await loadTasteSignals(userId);
  const onPlan = new Set(step.roadmap.steps.map((s) => s.itemSlug));

  let replacement: { itemId: string; slug: string; title: string; imageUrl?: string; reason: string; minutes: number; focus: string } | null = null;
  if (step.kind === "content") {
    const exclude = new Set(onPlan);
    const similar = await rankContent(signals, { limit: 1, excludeKnown: true, exclude, similarTo: step.itemSlug });
    const [pick] = similar.length ? similar : await rankContent(signals, { limit: 1, excludeKnown: true, exclude });
    if (pick) {
      const row = await prisma.content.findUnique({
        where: { slug: pick.id },
        select: {
          id: true,
          type: true,
          episodeDuration: true,
          episodeCount: true,
          seasonCount: true,
          seasons: { orderBy: { position: "asc" }, take: 1, select: { label: true, episodeCount: true } },
        },
      });
      if (row) {
        // Keep the swapped step's scope: a "Season 1 · …" step gets a first season back, not a whole saga.
        const season = row.seasons[0];
        const seasonScoped = step.focus.includes("·") && !isFilmType(row.type) && (row.seasonCount ?? 1) > 1 && season?.episodeCount;
        replacement = {
          itemId: row.id,
          slug: pick.id,
          title: pick.title,
          imageUrl: pick.imageUrl,
          reason: pick.reason ?? "",
          minutes: seasonScoped ? season.episodeCount * episodeMinutes(row) : fullRuntime(row),
          focus: seasonScoped
            ? `${season.label || "Season 1"} · ${season.episodeCount} episodes`
            : isFilmType(row.type)
              ? "Feature film"
              : `${row.episodeCount ?? "?"} episodes`,
        };
      }
    }
  } else if (step.kind === "track") {
    const [pick] = (await rankTracks(signals, { limit: 40, excludeKnown: true })).filter((t) => !onPlan.has(t.id));
    if (pick) {
      const row = await prisma.musicTrack.findUnique({ where: { slug: pick.id }, select: { id: true, durationSeconds: true, kind: true } });
      if (row) replacement = { itemId: row.id, slug: pick.id, title: `${pick.title} — ${pick.artist}`, imageUrl: pick.imageUrl, reason: pick.reason ?? "", minutes: Math.max(2, Math.round((row.durationSeconds ?? 210) / 60)), focus: row.kind === "ost" ? "OST" : "Song" };
    }
  } else {
    const [pick] = (await rankArtists(signals, { limit: 20, excludeKnown: true })).filter((a) => !onPlan.has(a.id));
    if (pick) {
      const row = await prisma.artist.findUnique({ where: { slug: pick.id }, select: { id: true } });
      if (row) replacement = { itemId: row.id, slug: pick.id, title: pick.title, imageUrl: pick.imageUrl, reason: pick.reason ?? "", minutes: 20, focus: "Explore their top songs" };
    }
  }
  if (!replacement) throw new Error("No new match to swap in right now.");

  await prisma.aiRoadmapStep.update({
    where: { id: stepId },
    data: {
      itemId: replacement.itemId,
      itemSlug: replacement.slug,
      title: replacement.title,
      imageUrl: replacement.imageUrl ?? null,
      focus: replacement.focus,
      estMinutes: replacement.minutes,
      why: `Swapped in for ${step.title}. ${replacement.reason}`.trim(),
      replacedTitle: step.title,
      status: "PENDING",
      progressMinutes: 0,
      startedAt: null,
      completedAt: null,
      lastActivityAt: null,
    },
  });
  const roadmap = await activeRoadmap(userId, step.roadmap.mode as Mode);
  if (roadmap) await reschedule(roadmap);
  return getActiveRoadmapView(userId, step.roadmap.mode as Mode);
}

export async function archiveRoadmap(userId: string, roadmapId: string) {
  await prisma.aiRoadmap.updateMany({ where: { id: roadmapId, userId }, data: { status: "ARCHIVED" } });
}
