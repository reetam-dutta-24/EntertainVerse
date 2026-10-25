import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const watchlist = await import("@/lib/services/watchlist.service");

const content = (slug: string) => ({
  id: `id-${slug}`,
  slug,
  title: slug,
  type: "ANIME",
  description: null,
  imageUrl: null,
  genres: [],
  rating: 8.84,
  meta: null,
  year: 2023,
  accent: null,
});
const item = (id: string, slug: string, fields: Record<string, unknown> = {}) => ({
  id,
  userId: "u1",
  contentId: `id-${slug}`,
  priority: "NORMAL",
  status: "PENDING",
  content: content(slug),
  ...fields,
});

beforeEach(() => {
  prisma.content.findUnique.mockImplementation(async ({ where }: { where: { slug: string } }) =>
    where.slug === "missing" ? null : { id: `id-${where.slug}` },
  );
});

describe("isContentOnWatchlist", () => {
  it("checks this user's watchlist for the title", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue({ id: "w1" });
    expect(await watchlist.isContentOnWatchlist("u1", "frieren")).toBe(true);
    expect(prisma.watchlistItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", contentId: "id-frieren" } }));

    prisma.watchlistItem.findFirst.mockResolvedValue(null);
    expect(await watchlist.isContentOnWatchlist("u1", "frieren")).toBe(false);
  });

  it("is false for an unknown title without querying the watchlist", async () => {
    expect(await watchlist.isContentOnWatchlist("u1", "missing")).toBe(false);
    expect(prisma.watchlistItem.findFirst).not.toHaveBeenCalled();
  });
});

describe("listWatchlistForUser", () => {
  it("lists high priority first, then most recently added, as content cards", async () => {
    prisma.watchlistItem.findMany.mockResolvedValue([item("w1", "frieren", { priority: "HIGH", status: "WATCHING" })]);
    const [card] = await watchlist.listWatchlistForUser("u1");

    expect(prisma.watchlistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" }, orderBy: [{ priority: "desc" }, { addedAt: "desc" }] }),
    );
    expect(card).toMatchObject({
      id: "frieren",
      watchlistItemId: "w1",
      watchlistPriority: "HIGH",
      watchlistStatus: "WATCHING",
      rating: 8.8,
      description: "frieren — saved to your AniVerse watchlist.",
    });
  });

  it("filters by priority and status only when asked", async () => {
    prisma.watchlistItem.findMany.mockResolvedValue([]);
    await watchlist.listWatchlistForUser("u1", { priority: "HIGH", status: "COMPLETED" });
    expect(prisma.watchlistItem.findMany.mock.calls[0]![0].where).toEqual({ userId: "u1", priority: "HIGH", status: "COMPLETED" });

    await watchlist.getHighPriorityWatchlist("u1");
    expect(prisma.watchlistItem.findMany.mock.calls[1]![0].where).toEqual({ userId: "u1", priority: "HIGH" });
  });
});

describe("getWatchlistStatsForUser", () => {
  it("counts saved, pending and high-priority items for this user", async () => {
    prisma.watchlistItem.count.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
      where.status === "PENDING" ? 4 : where.priority === "HIGH" ? 2 : 9,
    );
    prisma.watchlistItem.findMany.mockResolvedValue([]);

    expect(await watchlist.getWatchlistStatsForUser("u1")).toEqual({ savedItems: 9, pending: 4, highPriority: 2, avgAiMatch: 0 });
    for (const [args] of prisma.watchlistItem.count.mock.calls) expect(args.where.userId).toBe("u1");
  });

  // mapContentToItem never sets matchScore, so every card falls back to 78 + (list position % 19)
  // and "Avg AI Match" on /dashboard/watchlist is derived from list order, not the recommender.
  it.todo("averages the recommender's real match scores");
});

describe("addWatchlistItem", () => {
  it("adds the title for this user with the chosen priority and status", async () => {
    prisma.watchlistItem.create.mockResolvedValue(item("w1", "frieren"));
    await watchlist.addWatchlistItem("u1", { contentSlug: "frieren", priority: "HIGH", status: "PENDING" });
    expect(prisma.watchlistItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "u1", contentId: "id-frieren", priority: "HIGH", status: "PENDING" } }),
    );
  });

  it("rejects an unknown title", async () => {
    await expect(watchlist.addWatchlistItem("u1", { contentSlug: "missing", priority: "NORMAL", status: "PENDING" })).rejects.toThrow(
      new watchlist.WatchlistNotFoundError("Content not found."),
    );
    expect(prisma.watchlistItem.create).not.toHaveBeenCalled();
  });

  it("recognises the duplicate-entry database error", () => {
    expect(watchlist.isWatchlistConflict({ code: "P2002" })).toBe(true);
    expect(watchlist.isWatchlistConflict({ code: "P2025" })).toBe(false);
    expect(watchlist.isWatchlistConflict(new Error("boom"))).toBe(false);
    expect(watchlist.isWatchlistConflict(null)).toBe(false);
  });
});

describe("updateWatchlistItem / removeWatchlistItem", () => {
  it("only touches the user's own items", async () => {
    // w1 exists but belongs to u1: a lookup that ignores the owner would find it.
    const rows = [{ id: "w1", userId: "u1" }];
    prisma.watchlistItem.findFirst.mockImplementation(
      async ({ where }: { where: Record<string, unknown> }) => rows.find((row) => Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value)) ?? null,
    );

    await expect(watchlist.updateWatchlistItem("intruder", "w1", { status: "DROPPED" })).rejects.toThrow("Watchlist item not found.");
    await expect(watchlist.removeWatchlistItem("intruder", "w1")).rejects.toThrow("Watchlist item not found.");
    expect(prisma.watchlistItem.update).not.toHaveBeenCalled();
    expect(prisma.watchlistItem.delete).not.toHaveBeenCalled();
  });

  it("updates only the fields given", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue({ id: "w1" });
    await watchlist.updateWatchlistItem("u1", "w1", { status: "COMPLETED" });
    expect(prisma.watchlistItem.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "w1" }, data: { status: "COMPLETED" } }));

    await watchlist.updateWatchlistItem("u1", "w1", { priority: "HIGH", status: "WATCHING" });
    expect(prisma.watchlistItem.update.mock.calls[1]![0].data).toEqual({ priority: "HIGH", status: "WATCHING" });
  });

  it("removes an owned item", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue({ id: "w1" });
    await watchlist.removeWatchlistItem("u1", "w1");
    expect(prisma.watchlistItem.delete).toHaveBeenCalledWith({ where: { id: "w1" } });
  });
});

describe("startContentWatching (Watch Now)", () => {
  beforeEach(() => {
    prisma.watchlistItem.count.mockResolvedValue(12);
  });

  it("adds the title as WATCHING when it isn't saved yet", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue(null);
    expect(await watchlist.startContentWatching("u1", "frieren")).toEqual({ onWatchlist: true, watching: 12 });
    expect(prisma.watchlistItem.create).toHaveBeenCalledWith({
      data: { userId: "u1", contentId: "id-frieren", priority: "NORMAL", status: "WATCHING" },
    });
  });

  it("moves a saved title to WATCHING", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue({ id: "w1", status: "PENDING" });
    await watchlist.startContentWatching("u1", "frieren");
    expect(prisma.watchlistItem.update).toHaveBeenCalledWith({ where: { id: "w1" }, data: { status: "WATCHING" } });
    expect(prisma.watchlistItem.create).not.toHaveBeenCalled();
  });

  it("leaves an already-watching title alone", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue({ id: "w1", status: "WATCHING" });
    await watchlist.startContentWatching("u1", "frieren");
    expect(prisma.watchlistItem.update).not.toHaveBeenCalled();
    expect(prisma.watchlistItem.create).not.toHaveBeenCalled();
  });

  it("counts everyone watching the title", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue(null);
    await watchlist.startContentWatching("u1", "frieren");
    expect(prisma.watchlistItem.count).toHaveBeenCalledWith({ where: { contentId: "id-frieren", status: "WATCHING" } });
  });

  it("rejects an unknown title", async () => {
    await expect(watchlist.startContentWatching("u1", "missing")).rejects.toBeInstanceOf(watchlist.WatchlistNotFoundError);
  });
});

describe("toggleContentWatchlist", () => {
  it("removes a saved title and says whether it was being watched", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue({ id: "w1", status: "WATCHING" });
    expect(await watchlist.toggleContentWatchlist("u1", "frieren")).toEqual({ onWatchlist: false, wasWatching: true });
    expect(prisma.watchlistItem.delete).toHaveBeenCalledWith({ where: { id: "w1" } });

    prisma.watchlistItem.findFirst.mockResolvedValue({ id: "w2", status: "PENDING" });
    expect(await watchlist.toggleContentWatchlist("u1", "frieren")).toEqual({ onWatchlist: false, wasWatching: false });
  });

  it("adds an unsaved title", async () => {
    prisma.watchlistItem.findFirst.mockResolvedValue(null);
    expect(await watchlist.toggleContentWatchlist("u1", "frieren")).toEqual({ onWatchlist: true, wasWatching: false });
    expect(prisma.watchlistItem.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "u1", contentId: "id-frieren" }) });
  });

  it("rejects an unknown title", async () => {
    await expect(watchlist.toggleContentWatchlist("u1", "missing")).rejects.toThrow("Content not found.");
  });
});
