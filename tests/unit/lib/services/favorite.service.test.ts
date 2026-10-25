import { beforeEach, describe, expect, it, vi } from "vitest";
import { rawSql, type PrismaMock } from "../../../helpers/prisma-mock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));
vi.mock("@/lib/cache/server-cache", () => ({ invalidateUser: vi.fn() }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { invalidateUser } = await import("@/lib/cache/server-cache");
const favorites = await import("@/lib/services/favorite.service");

/** The raw SQL statements run, in order, with their bound values. */
const executed = () => prisma.$executeRaw.mock.calls.map((call) => ({ sql: rawSql(call), values: call.slice(1) }));

describe("is…Favorited", () => {
  it.each([
    ["isContentFavorited", "ContentFavorite"],
    ["isCollectionFavorited", "CollectionFavorite"],
    ["isTrackFavorited", "TrackFavorite"],
    ["isArtistFavorited", "ArtistFavorite"],
  ] as const)("%s checks %s for this user and slug", async (fn, table) => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: "fav-1" }]).mockResolvedValueOnce([]);

    expect(await favorites[fn]("u1", "frieren")).toBe(true);
    expect(await favorites[fn]("u1", "frieren")).toBe(false);

    const [call] = prisma.$queryRaw.mock.calls;
    expect(rawSql(call!)).toContain(`FROM "${table}"`);
    // Values are bound as parameters, never interpolated into the SQL.
    expect(call!.slice(1)).toEqual(["u1", "frieren"]);
    expect(rawSql(call!)).not.toContain("frieren");
  });
});

describe("toggleContentFavorite", () => {
  beforeEach(() => {
    prisma.content.findUnique.mockResolvedValue({ id: "c1" });
    prisma.contentFavorite.count.mockResolvedValue(7);
  });

  it("adds a favorite, returns the fresh count and clears the user's cache", async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    expect(await favorites.toggleContentFavorite("u1", "frieren")).toEqual({ favorited: true, favoriteCount: 7 });
    const [insert] = executed();
    expect(insert!.sql).toMatch(/^INSERT INTO "ContentFavorite"/);
    expect(insert!.values).toEqual([expect.any(String), "u1", "c1"]);
    expect(prisma.contentFavorite.count).toHaveBeenCalledWith({ where: { contentId: "c1" } });
    expect(invalidateUser).toHaveBeenCalledWith("u1");
  });

  it("removes an existing favorite", async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: "fav-1" }]);

    expect(await favorites.toggleContentFavorite("u1", "frieren")).toEqual({ favorited: false, favoriteCount: 7 });
    expect(executed()).toEqual([{ sql: 'DELETE FROM "ContentFavorite" WHERE id = ?', values: ["fav-1"] }]);
    expect(invalidateUser).toHaveBeenCalledWith("u1");
  });

  it("rejects unknown content without writing", async () => {
    prisma.content.findUnique.mockResolvedValue(null);
    await expect(favorites.toggleContentFavorite("u1", "nope")).rejects.toThrow(new favorites.FavoriteNotFoundError("Content not found."));
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(invalidateUser).not.toHaveBeenCalled();
  });
});

describe("toggleCollectionFavorite", () => {
  beforeEach(() => {
    prisma.collection.findUnique.mockResolvedValue({ id: "col-1", favoriteCount: 2 });
  });

  it("inserts and increments the stored count in one transaction", async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.collection.update.mockResolvedValue({ favoriteCount: 3 });

    expect(await favorites.toggleCollectionFavorite("u1", "cozy-picks")).toEqual({ favorited: true, favoriteCount: 3 });
    expect(executed()[0]!.sql).toMatch(/^INSERT INTO "CollectionFavorite"/);
    expect(prisma.collection.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "col-1" }, data: { favoriteCount: { increment: 1 } } }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(invalidateUser).toHaveBeenCalledWith("u1");
  });

  it("deletes and decrements, never reporting below zero", async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: "fav-1" }]);
    prisma.collection.update.mockResolvedValue({ favoriteCount: -1 });

    expect(await favorites.toggleCollectionFavorite("u1", "cozy-picks")).toEqual({ favorited: false, favoriteCount: 0 });
    expect(executed()).toEqual([{ sql: 'DELETE FROM "CollectionFavorite" WHERE id = ?', values: ["fav-1"] }]);
    expect(prisma.collection.update).toHaveBeenCalledWith(expect.objectContaining({ data: { favoriteCount: { decrement: 1 } } }));
  });

  it("doesn't clear the cache if the write fails", async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$executeRaw.mockRejectedValue(new Error("unique violation"));
    await expect(favorites.toggleCollectionFavorite("u1", "cozy-picks")).rejects.toThrow("unique violation");
    expect(invalidateUser).not.toHaveBeenCalled();
  });

  it("rejects an unknown collection", async () => {
    prisma.collection.findUnique.mockResolvedValue(null);
    await expect(favorites.toggleCollectionFavorite("u1", "nope")).rejects.toThrow("Collection not found.");
  });
});

describe.each([
  ["toggleTrackFavorite", "musicTrack", "TrackFavorite", "Track not found."],
  ["toggleArtistFavorite", "artist", "ArtistFavorite", "Artist not found."],
] as const)("%s", (fn, model, table, notFound) => {
  beforeEach(() => {
    prisma[model]!.findUnique!.mockResolvedValue({ id: "item-1" });
  });

  it("adds a favorite", async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    expect(await favorites[fn]("u1", "slug")).toEqual({ favorited: true });
    expect(executed()[0]).toEqual({ sql: expect.stringMatching(new RegExp(`^INSERT INTO "${table}"`)), values: [expect.any(String), "u1", "item-1"] });
    expect(invalidateUser).toHaveBeenCalledWith("u1");
  });

  it("removes an existing favorite", async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: "fav-1" }]);
    expect(await favorites[fn]("u1", "slug")).toEqual({ favorited: false });
    expect(executed()).toEqual([{ sql: `DELETE FROM "${table}" WHERE id = ?`, values: ["fav-1"] }]);
    expect(invalidateUser).toHaveBeenCalledWith("u1");
  });

  it("rejects an unknown item", async () => {
    prisma[model]!.findUnique!.mockResolvedValue(null);
    await expect(favorites[fn]("u1", "nope")).rejects.toThrow(notFound);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});

describe("listUserFavorite…", () => {
  it.each([
    ["listUserFavoriteContent", "contentFavorite", "content"],
    ["listUserFavoriteTracks", "trackFavorite", "track"],
    ["listUserFavoriteArtists", "artistFavorite", "artist"],
    ["listUserFavoriteCollections", "collectionFavorite", "collection"],
  ] as const)("%s returns the user's items, newest first", async (fn, model, relation) => {
    prisma[model]!.findMany!.mockResolvedValue([{ [relation]: { id: "newer" } }, { [relation]: { id: "older" } }]);

    expect(await favorites[fn]("u1")).toEqual([{ id: "newer" }, { id: "older" }]);
    expect(prisma[model]!.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" }, orderBy: { createdAt: "desc" } }));
  });
});
