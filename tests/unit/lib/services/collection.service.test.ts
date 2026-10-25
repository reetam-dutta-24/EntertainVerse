import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));
vi.mock("@/lib/recommender/social", () => ({ rankCollectionsForUser: vi.fn(async () => new Map()) }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const collections = await import("@/lib/services/collection.service");

const OWNER = "owner";
const STRANGER = "stranger";

// One collection, owned by OWNER, holding Frieren at position 0.
let items: { id: string; collectionId: string; contentId: string | null; trackId: string | null; position: number }[];
const collection = { id: "col-1", slug: "cozy-picks", userId: OWNER, visibility: "PUBLIC" };
type Where = Record<string, unknown>;
const matches = (row: Where, where: Where) => Object.entries(where).every(([key, value]) => row[key] === value);

beforeEach(() => {
  items = [{ id: "item-1", collectionId: "col-1", contentId: "id-frieren", trackId: null, position: 0 }];
  // Owner-scoped lookups: `where: { slug, userId }` only finds the owner's collection.
  prisma.collection.findFirst.mockImplementation(async ({ where }: { where: Where }) =>
    matches(collection, where) ? { ...collection, items: items.map(({ position }) => ({ position })) } : null,
  );
  prisma.content.findUnique.mockImplementation(async ({ where }: { where: { slug: string } }) => (where.slug === "missing" ? null : { id: `id-${where.slug}` }));
  prisma.musicTrack.findUnique.mockImplementation(async ({ where }: { where: { slug: string } }) => (where.slug === "missing" ? null : { id: `track-${where.slug}` }));
  prisma.collectionItem.findFirst.mockImplementation(async ({ where }: { where: Where }) => items.find((item) => matches(item, where)) ?? null);
  prisma.collectionItem.create.mockImplementation(async ({ data }: { data: (typeof items)[number] }) => {
    const row = { ...data, id: `item-${items.length + 1}`, contentId: data.contentId ?? null, trackId: data.trackId ?? null };
    items.push(row);
    return row;
  });
  prisma.collectionItem.count.mockImplementation(async () => items.length);
  prisma.collectionItem.delete.mockImplementation(async ({ where }: { where: { id: string } }) => {
    items = items.filter((item) => item.id !== where.id);
  });
  prisma.collection.create.mockImplementation(async ({ data }: { data: Where }) => ({ id: "col-new", ...data }));
});

describe("only the owner can change a collection", () => {
  it.each([
    ["update", () => collections.updateCollection(STRANGER, "cozy-picks", { name: "Mine now" })],
    ["delete", () => collections.deleteCollection(STRANGER, "cozy-picks")],
    ["add an item", () => collections.addCollectionItem(STRANGER, "cozy-picks", { contentSlug: "mushishi" })],
    ["remove an item", () => collections.removeCollectionItem(STRANGER, "cozy-picks", "item-1")],
  ])("a stranger can't %s", async (_, attempt) => {
    await expect(attempt()).rejects.toThrow(new collections.CollectionNotFoundError("Collection not found."));
    expect(prisma.collection.update).not.toHaveBeenCalled();
    expect(prisma.collection.delete).not.toHaveBeenCalled();
    expect(prisma.collectionItem.create).not.toHaveBeenCalled();
    expect(prisma.collectionItem.delete).not.toHaveBeenCalled();
  });

  // collection-collaborator.service adds people with role "editor", but every write here
  // looks the collection up by { slug, userId: owner } — collaborators get no access.
  it.todo("collaborators with the editor role can add and remove items");

  it("deletes the owner's collection", async () => {
    await collections.deleteCollection(OWNER, "cozy-picks");
    expect(prisma.collection.delete).toHaveBeenCalledWith({ where: { id: "col-1" } });
  });
});

describe("createCollection", () => {
  it("slugifies the name and applies defaults", async () => {
    await collections.createCollection(OWNER, { name: "  Cozy Picks!  ", visibility: "PRIVATE" } as never);
    expect(prisma.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: OWNER, slug: "cozy-picks", name: "Cozy Picks!", category: "Mixed", kind: "content", accent: "blue", visibility: "PRIVATE", description: null }),
      }),
    );
  });

  it("adds initial titles and songs in order, skipping unknown ones and duplicates", async () => {
    items = [];
    prisma.collection.findUnique.mockResolvedValue({ id: "col-new", slug: "mix" });
    await collections.createCollection(OWNER, {
      name: "Mix",
      visibility: "PUBLIC",
      initialContentSlugs: ["frieren", "missing", "frieren", "mushishi"],
      initialTrackSlugs: ["sparkle"],
    } as never);

    expect(items.map((item) => [item.contentId ?? item.trackId, item.position])).toEqual([
      ["id-frieren", 0],
      ["id-mushishi", 1],
      ["track-sparkle", 2],
    ]);
    expect(prisma.collection.update).toHaveBeenCalledWith({ where: { id: "col-new" }, data: { itemCount: 3 } });
  });

  it("recognises a slug clash", () => {
    expect(collections.isCollectionConflict({ code: "P2002" })).toBe(true);
    expect(collections.isCollectionConflict(new Error("other"))).toBe(false);
  });
});

describe("updateCollection", () => {
  it("changes only the fields given, clearing blanked text to null", async () => {
    await collections.updateCollection(OWNER, "cozy-picks", { visibility: "PRIVATE", description: "   " } as never);
    expect(prisma.collection.update.mock.calls[0]![0]).toMatchObject({ where: { id: "col-1" }, data: { visibility: "PRIVATE", description: null } });
    expect(Object.keys(prisma.collection.update.mock.calls[0]![0].data)).toEqual(["description", "visibility"]);
  });
});

describe("addCollectionItem", () => {
  it("appends after the last position and refreshes the count", async () => {
    await collections.addCollectionItem(OWNER, "cozy-picks", { contentSlug: "mushishi" });
    expect(items.at(-1)).toMatchObject({ contentId: "id-mushishi", position: 1 });
    expect(prisma.collection.update).toHaveBeenCalledWith({ where: { id: "col-1" }, data: { itemCount: 2 } });
  });

  it("refuses a title or song already in the collection", async () => {
    await expect(collections.addCollectionItem(OWNER, "cozy-picks", { contentSlug: "frieren" })).rejects.toThrow("This title is already in the collection.");
    items.push({ id: "item-2", collectionId: "col-1", contentId: null, trackId: "track-sparkle", position: 1 });
    const attempt = collections.addCollectionItem(OWNER, "cozy-picks", { trackSlug: "sparkle" });
    await expect(attempt).rejects.toThrow("This song is already in the collection.");
    await expect(attempt.catch(collections.isCollectionItemDuplicate)).resolves.toBe(true);
  });

  it("rejects unknown titles and songs", async () => {
    await expect(collections.addCollectionItem(OWNER, "cozy-picks", { contentSlug: "missing" })).rejects.toThrow("Content not found.");
    await expect(collections.addCollectionItem(OWNER, "cozy-picks", { trackSlug: "missing" })).rejects.toThrow("Track not found.");
    expect(prisma.collectionItem.create).not.toHaveBeenCalled();
  });
});

describe("removeCollectionItem", () => {
  it("removes the item and refreshes the count", async () => {
    await collections.removeCollectionItem(OWNER, "cozy-picks", "item-1");
    expect(items).toEqual([]);
    expect(prisma.collection.update).toHaveBeenCalledWith({ where: { id: "col-1" }, data: { itemCount: 0 } });
  });

  it("only removes items that belong to this collection", async () => {
    await expect(collections.removeCollectionItem(OWNER, "cozy-picks", "item-from-another-collection")).rejects.toThrow("Collection item not found.");
    expect(prisma.collectionItem.findFirst).toHaveBeenCalledWith({ where: { id: "item-from-another-collection", collectionId: "col-1" } });
    expect(prisma.collectionItem.delete).not.toHaveBeenCalled();
  });
});

describe("getCollectionDetailBySlug", () => {
  it("hides a private collection from everyone but its owner", async () => {
    prisma.collection.findUnique.mockResolvedValue({ ...collection, visibility: "PRIVATE", items: [] });
    expect(await collections.getCollectionDetailBySlug("cozy-picks", STRANGER)).toBeNull();
    expect(await collections.getCollectionDetailBySlug("cozy-picks")).toBeNull();
    // Nothing else about it is loaded for them.
    expect(prisma.collection.findMany).not.toHaveBeenCalled();
  });

  it("is null for an unknown slug", async () => {
    prisma.collection.findUnique.mockResolvedValue(null);
    expect(await collections.getCollectionDetailBySlug("nope", OWNER)).toBeNull();
  });

  it("shows a public collection to anyone, suggesting only public collections (or their own) as similar", async () => {
    const owner = { id: OWNER, name: "Owner", handle: "owner", avatarColor: "rose", avatarUrl: null };
    prisma.collection.findUnique.mockResolvedValue({
      ...collection,
      name: "Cozy Picks",
      kind: "content",
      category: "Anime",
      genreLabels: [],
      itemCount: 0,
      favoriteCount: 0,
      followerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: owner,
      items: [],
    });
    for (const model of ["collection", "community", "content", "watchlistItem"]) prisma[model]!.findMany!.mockResolvedValue([]);

    expect(await collections.getCollectionDetailBySlug("cozy-picks", STRANGER)).toMatchObject({ name: "Cozy Picks" });
    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { not: "cozy-picks" }, OR: [{ visibility: "PUBLIC" }, { userId: STRANGER }] } }),
    );
  });
});

describe("public listings", () => {
  it("never include private collections", async () => {
    prisma.collection.findMany.mockResolvedValue([]);
    await collections.listPublicCollections();
    await collections.listDiscoverablePublicCollections(OWNER);
    expect(prisma.collection.findMany).toHaveBeenCalledTimes(2);
    for (const [args] of prisma.collection.findMany.mock.calls) expect(args.where).toMatchObject({ visibility: "PUBLIC" });
    // Discover also skips your own collections and ones you've already favourited.
    expect(prisma.collection.findMany.mock.calls[1]![0].where).toEqual({ visibility: "PUBLIC", userId: { not: OWNER }, favorites: { none: { userId: OWNER } } });
  });
});
