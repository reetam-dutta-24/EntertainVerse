import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CacheModule = typeof import("@/lib/cache/server-cache");
let cache: CacheModule;

// The store lives on globalThis and is captured at import time: drop it and
// re-import so every test starts with an empty cache.
beforeEach(async () => {
  delete (globalThis as { __aniverseCache?: unknown }).__aniverseCache;
  vi.resetModules();
  vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
  cache = await import("@/lib/cache/server-cache");
});

afterEach(() => {
  vi.useRealTimers();
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe("cached", () => {
  it("loads on a miss and serves from memory while fresh", async () => {
    const loader = vi.fn(async () => "value");
    expect(await cache.cached("k", { ttl: 60, tags: [] }, loader)).toBe("value");
    expect(await cache.cached("k", { ttl: 60, tags: [] }, loader)).toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.cacheStats()).toMatchObject({ misses: 1, hits: 1, entries: 1 });
  });

  it("shares one load between concurrent misses (single-flight)", async () => {
    const gate = deferred<number>();
    const loader = vi.fn(() => gate.promise);
    const first = cache.cached("k", { ttl: 60, tags: [] }, loader);
    const second = cache.cached("k", { ttl: 60, tags: [] }, loader);
    gate.resolve(42);
    await expect(Promise.all([first, second])).resolves.toEqual([42, 42]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("serves a stale value instantly and refreshes it once in the background", async () => {
    let version = 1;
    const loader = vi.fn(async () => version);
    await cache.cached("k", { ttl: 10, swr: 60, tags: [] }, loader);

    version = 2;
    vi.advanceTimersByTime(11_000);
    // Stale: the old value comes back immediately…
    expect(await cache.cached("k", { ttl: 10, swr: 60, tags: [] }, loader)).toBe(1);
    expect(cache.cacheStats().stale).toBe(1);
    // …and the background refresh replaces it.
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(await cache.cached("k", { ttl: 10, swr: 60, tags: [] }, loader)).toBe(2);
  });

  it("reloads (blocking) once past the stale window", async () => {
    let version = 1;
    const loader = vi.fn(async () => version);
    await cache.cached("k", { ttl: 10, swr: 5, tags: [] }, loader);
    version = 2;
    vi.advanceTimersByTime(16_000);
    expect(await cache.cached("k", { ttl: 10, swr: 5, tags: [] }, loader)).toBe(2);
    expect(cache.cacheStats().misses).toBe(2);
  });

  it("doesn't cache a failed load", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce("ok");
    await expect(cache.cached("k", { ttl: 60, tags: [] }, loader)).rejects.toThrow("db down");
    expect(await cache.cached("k", { ttl: 60, tags: [] }, loader)).toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("bypasses the cache entirely with SERVER_CACHE=off", async () => {
    vi.stubEnv("SERVER_CACHE", "off");
    const loader = vi.fn(async () => "value");
    await cache.cached("k", { ttl: 60, tags: [] }, loader);
    await cache.cached("k", { ttl: 60, tags: [] }, loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(cache.cacheStats().entries).toBe(0);
  });

  it("evicts the least recently used entry past 2,000 entries", async () => {
    const options = { ttl: 600, tags: [] };
    for (let i = 0; i < 2_000; i++) await cache.cached(`k${i}`, options, async () => i);
    // Touch k0 so k1 becomes the oldest.
    await cache.cached("k0", options, async () => -1);
    await cache.cached("overflow", options, async () => "new");

    expect(cache.cacheStats().entries).toBe(2_000);
    const reload = vi.fn(async () => "reloaded");
    expect(await cache.cached("k0", options, reload)).toBe(0);
    expect(await cache.cached("k1", options, reload)).toBe("reloaded");
  });
});

describe("invalidateTags", () => {
  it("drops every entry carrying the tag and leaves the rest", async () => {
    await cache.cached("a", { ttl: 60, tags: ["catalog"] }, async () => "a1");
    await cache.cached("b", { ttl: 60, tags: ["catalog", "user:1"] }, async () => "b1");
    await cache.cached("c", { ttl: 60, tags: ["user:2"] }, async () => "c1");

    cache.invalidateTags("catalog");

    expect(await cache.cached("a", { ttl: 60, tags: ["catalog"] }, async () => "a2")).toBe("a2");
    expect(await cache.cached("b", { ttl: 60, tags: ["catalog", "user:1"] }, async () => "b2")).toBe("b2");
    expect(await cache.cached("c", { ttl: 60, tags: ["user:2"] }, async () => "c2")).toBe("c1");
  });

  it("invalidateUser clears only that user's entries", async () => {
    await cache.cached("u1", { ttl: 60, tags: [cache.CacheTags.user("1")] }, async () => "one");
    await cache.cached("u2", { ttl: 60, tags: [cache.CacheTags.user("2")] }, async () => "two");
    cache.invalidateUser("1");
    expect(cache.cacheStats().entries).toBe(1);
  });

  it("discards a load that was in flight when its tag was invalidated", async () => {
    // A read that started before a write may hold pre-write data; it must not be stored.
    const gate = deferred<string>();
    const pending = cache.cached("k", { ttl: 60, tags: ["catalog"] }, () => gate.promise);
    cache.invalidateTags("catalog");
    gate.resolve("pre-write");

    expect(await pending).toBe("pre-write");
    expect(cache.cacheStats().entries).toBe(0);
    expect(await cache.cached("k", { ttl: 60, tags: ["catalog"] }, async () => "post-write")).toBe("post-write");
  });
});
