import type { Prisma, WatchlistPriority, WatchlistStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isHighPriority,
  mapWatchlistItemToContent,
} from "@/lib/mappers/watchlist.mapper";
import type { ContentItem } from "@/types";
import type {
  WatchlistFormInput,
  WatchlistUpdateInput,
} from "@/lib/validators/watchlist";

const contentInclude = {
  genres: { include: { genre: true } },
} satisfies Prisma.ContentInclude;

async function findContentIdBySlug(slug: string) {
  const row = await prisma.content.findUnique({
    where: { slug },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function isContentOnWatchlist(
  userId: string,
  contentSlug: string,
): Promise<boolean> {
  const contentId = await findContentIdBySlug(contentSlug);
  if (!contentId) return false;
  const row = await prisma.watchlistItem.findFirst({
    where: { userId, contentId },
    select: { id: true },
  });
  return row != null;
}

export async function listWatchlistForUser(
  userId: string,
  options: {
    priority?: WatchlistPriority;
    status?: WatchlistStatus;
  } = {},
): Promise<ContentItem[]> {
  const rows = await prisma.watchlistItem.findMany({
    where: {
      userId,
      ...(options.priority ? { priority: options.priority } : {}),
      ...(options.status ? { status: options.status } : {}),
    },
    include: { content: { include: contentInclude } },
    orderBy: [{ priority: "desc" }, { addedAt: "desc" }],
  });

  const scores = await scoreWatchlist(
    userId,
    rows.map((row) => row.content.slug),
  );
  return rows.map((row) => mapWatchlistItemToContent(row, scores.get(row.content.slug)));
}

/** Real recommender scores; the list still renders (without scores) if ranking fails. */
async function scoreWatchlist(userId: string, slugs: string[]) {
  if (!slugs.length) return new Map<string, number>();
  try {
    const { scoreContentForUser } = await import("@/lib/services/taste-engine.service");
    return await scoreContentForUser(userId, slugs);
  } catch (error) {
    console.error("[watchlist] match scores unavailable", error);
    return new Map<string, number>();
  }
}

export async function getWatchlistStatsForUser(userId: string) {
  const [savedItems, pending, highPriority, items] = await Promise.all([
    prisma.watchlistItem.count({ where: { userId } }),
    prisma.watchlistItem.count({ where: { userId, status: "PENDING" } }),
    prisma.watchlistItem.count({ where: { userId, priority: "HIGH" } }),
    listWatchlistForUser(userId),
  ]);

  const scores = items
    .map((item) => item.matchScore)
    .filter((score): score is number => score != null);
  const avgAiMatch =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;

  return { savedItems, pending, highPriority, avgAiMatch };
}

export async function addWatchlistItem(userId: string, input: WatchlistFormInput) {
  const contentId = await findContentIdBySlug(input.contentSlug);
  if (!contentId) {
    throw new WatchlistNotFoundError("Content not found.");
  }

  return prisma.watchlistItem.create({
    data: {
      userId,
      contentId,
      priority: input.priority,
      status: input.status,
    },
    include: { content: { include: contentInclude } },
  });
}

export async function updateWatchlistItem(
  userId: string,
  itemId: string,
  input: WatchlistUpdateInput,
) {
  const existing = await prisma.watchlistItem.findFirst({
    where: { id: itemId, userId },
  });
  if (!existing) throw new WatchlistNotFoundError("Watchlist item not found.");

  return prisma.watchlistItem.update({
    where: { id: itemId },
    data: {
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    include: { content: { include: contentInclude } },
  });
}

export async function removeWatchlistItem(userId: string, itemId: string) {
  const existing = await prisma.watchlistItem.findFirst({
    where: { id: itemId, userId },
  });
  if (!existing) throw new WatchlistNotFoundError("Watchlist item not found.");
  return prisma.watchlistItem.delete({ where: { id: itemId } });
}

/** Marks content as actively watching — used by Watch Now, increments global KPI when new. */
export async function startContentWatching(userId: string, contentSlug: string) {
  const contentId = await findContentIdBySlug(contentSlug);
  if (!contentId) throw new WatchlistNotFoundError("Content not found.");

  const existing = await prisma.watchlistItem.findFirst({
    where: { userId, contentId },
    select: { id: true, status: true },
  });

  if (existing) {
    if (existing.status !== "WATCHING") {
      await prisma.watchlistItem.update({
        where: { id: existing.id },
        data: { status: "WATCHING" },
      });
    }
  } else {
    await prisma.watchlistItem.create({
      data: {
        userId,
        contentId,
        priority: "NORMAL",
        status: "WATCHING",
      },
    });
  }

  const watching = await prisma.watchlistItem.count({
    where: { contentId, status: "WATCHING" },
  });

  return { onWatchlist: true, watching };
}

export async function toggleContentWatchlist(userId: string, contentSlug: string) {
  const contentId = await findContentIdBySlug(contentSlug);
  if (!contentId) throw new WatchlistNotFoundError("Content not found.");

  const existing = await prisma.watchlistItem.findFirst({
    where: { userId, contentId },
    select: { id: true, status: true },
  });

  if (existing) {
    await prisma.watchlistItem.delete({ where: { id: existing.id } });
    return { onWatchlist: false, wasWatching: existing.status === "WATCHING" };
  }

  await prisma.watchlistItem.create({
    data: {
      userId,
      contentId,
      priority: "NORMAL",
      // Saved, not started — the same default as the add-to-watchlist form.
      status: "PENDING",
    },
  });
  return { onWatchlist: true, wasWatching: false };
}

export async function getHighPriorityWatchlist(userId: string) {
  return listWatchlistForUser(userId, { priority: "HIGH" });
}

export async function getAllWatchlistItems(userId: string) {
  return listWatchlistForUser(userId);
}

export class WatchlistNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatchlistNotFoundError";
  }
}

export class WatchlistConflictError extends Error {
  constructor() {
    super("This title is already on your watchlist.");
    this.name = "WatchlistConflictError";
  }
}

export function isWatchlistConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export { isHighPriority };
