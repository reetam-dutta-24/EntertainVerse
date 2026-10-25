import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invalidateTags = vi.fn();

vi.mock("@/lib/cache/server-cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cache/server-cache")>()),
  invalidateTags: (...tags: string[]) => invalidateTags(...tags),
}));
// defineExtension wraps the definition for the client; unwrap it so the hooks can be called directly.
vi.mock("@prisma/client", () => ({ Prisma: { defineExtension: <T>(definition: T) => definition } }));

const { cacheInvalidation } = await import("@/lib/cache/invalidation");

interface Hooks {
  query: {
    $allModels: { $allOperations: (input: { model: string; operation: string; args: unknown; query: (args: unknown) => Promise<unknown> }) => Promise<unknown> };
    $executeRaw: (input: { args: unknown; query: (args: unknown) => Promise<unknown> }) => Promise<unknown>;
  };
}
const hooks = (cacheInvalidation as unknown as Hooks).query;

function run(model: string, operation: string, args: unknown, result: unknown = {}) {
  return hooks.$allModels.$allOperations({ model, operation, args, query: async () => result });
}

/** Tags cleared immediately (the delayed second pass is checked separately). */
const clearedNow = () => invalidateTags.mock.calls[0] ?? [];

beforeEach(() => {
  vi.useFakeTimers();
  invalidateTags.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cacheInvalidation", () => {
  it("returns the query result untouched", async () => {
    const row = { id: "c1", title: "Frieren" };
    expect(await run("Content", "update", { where: { id: "c1" }, data: { title: "Frieren" } }, row)).toBe(row);
  });

  it("leaves reads alone", async () => {
    await run("Content", "findMany", {});
    await run("Content", "findUnique", { where: { id: "c1" } });
    expect(invalidateTags).not.toHaveBeenCalled();
  });

  it("clears the shared tag for the written model", async () => {
    await run("Content", "update", { where: { id: "c1" }, data: { title: "New" } });
    expect(clearedNow()).toEqual(["catalog"]);

    invalidateTags.mockClear();
    await run("CollectionItem", "create", { data: { collectionId: "x" } });
    expect(clearedNow()).toEqual(["collections"]);
  });

  it("keeps catalog data on counter-only updates", async () => {
    await run("Content", "update", { where: { id: "c1" }, data: { viewCount: { increment: 1 } } });
    expect(invalidateTags).not.toHaveBeenCalled();
  });

  it("treats a mixed counter + field update as a real write", async () => {
    await run("Content", "update", { where: { id: "c1" }, data: { viewCount: { increment: 1 }, title: "New" } });
    expect(clearedNow()).toEqual(["catalog"]);
  });

  it("clears the user found in where, data, or the returned row", async () => {
    await run("WatchEvent", "create", { data: { userId: "u1", minutes: 20 } });
    expect(clearedNow()).toEqual(["user:u1"]);

    invalidateTags.mockClear();
    await run("Follow", "delete", { where: { id: "f1" } }, { followerId: "u2", followingId: "u3" });
    expect(clearedNow()).toEqual(expect.arrayContaining(["user:u2", "user:u3"]));
  });

  it("finds users inside compound unique keys", async () => {
    await run("ContentFavorite", "delete", { where: { userId_contentId: { userId: "u9", contentId: "c1" } } });
    expect(clearedNow()).toEqual(["user:u9"]);
  });

  it("clears both shared and per-user tags for a user's write to shared data", async () => {
    await run("CommunityPost", "create", { data: { authorId: "u1", body: "hi" } });
    expect(clearedNow()).toEqual(["communities", "user:u1"]);
  });

  it("clears the user row's own tag on User writes", async () => {
    await run("User", "update", { where: { id: "u5" }, data: { bio: "hi" } }, { id: "u5" });
    expect(clearedNow()).toEqual(["user:u5"]);
  });

  it("clears again shortly after (delayed double delete for transactions)", async () => {
    await run("Content", "update", { where: { id: "c1" }, data: { title: "New" } });
    expect(invalidateTags).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(invalidateTags).toHaveBeenCalledTimes(2);
    expect(invalidateTags.mock.calls[1]).toEqual(["catalog"]);
  });

  it("parses table names from raw SQL writes", async () => {
    const sql = { strings: ['UPDATE "Content" SET "viewCount" = "viewCount" + 1 WHERE id = ', ""], values: ["c1"] };
    await hooks.$executeRaw({ args: [sql], query: async () => 1 });
    expect(clearedNow()).toEqual(["catalog"]);

    invalidateTags.mockClear();
    await hooks.$executeRaw({ args: ['DELETE FROM "UnknownTable" WHERE 1=1'], query: async () => 1 });
    expect(invalidateTags).not.toHaveBeenCalled();
  });
});
