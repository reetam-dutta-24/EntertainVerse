/**
 * Server-side data cache — shared across requests in the long-running Node server.
 *
 * AniVerse runs as one Node process (`server.ts`: Next + Socket.IO), so an in-memory
 * cache is the fastest option and can hold values Next's serialized caches can't
 * (Maps/Sets of taste signals, Float32Array embeddings).
 *
 * - TTL + stale-while-revalidate: a stale entry is served instantly while one
 *   background refresh runs.
 * - Single-flight: concurrent misses for the same key share one load.
 * - Tags: entries are invalidated by tag. Database writes invalidate tags automatically
 *   (see `lib/cache/invalidation.ts`), so cached data can't silently drift.
 * - Bounded: least-recently-used entries are evicted past MAX_ENTRIES.
 *
 * Cached values are shared by every request — callers must treat them as read-only.
 * Deliberately not `server-only`: the Socket.IO server imports services that use it.
 */

const MAX_ENTRIES = 2_000;

interface Entry {
  value: unknown;
  tags: string[];
  /** Fresh until this time. */
  freshUntil: number;
  /** May be served (while refreshing) until this time. */
  staleUntil: number;
}

interface Store {
  /** Map preserves insertion order — re-inserting on read makes it an LRU. */
  entries: Map<string, Entry>;
  inflight: Map<string, Promise<unknown>>;
  tagIndex: Map<string, Set<string>>;
  /** Bumped on every invalidation of a tag — a load that started before it isn't stored. */
  tagVersions: Map<string, number>;
  stats: { hits: number; stale: number; misses: number; invalidations: number };
}

const globalStore = globalThis as unknown as { __aniverseCache?: Store };
// One store per process, shared by Next's module graph and server.ts (and kept across HMR).
const store: Store = (globalStore.__aniverseCache ??= {
  entries: new Map(),
  inflight: new Map(),
  tagIndex: new Map(),
  tagVersions: new Map(),
  stats: { hits: 0, stale: 0, misses: 0, invalidations: 0 },
});

export interface CacheOptions {
  /** Seconds the value is fresh. */
  ttl: number;
  /** Extra seconds a stale value may be served while it refreshes in the background. */
  swr?: number;
  tags: string[];
}

/** Cache tags. Per-user data is tagged `user:<id>`. */
export const CacheTags = {
  catalog: "catalog",
  communities: "communities",
  collections: "collections",
  embeddings: "embeddings",
  user: (userId: string) => `user:${userId}`,
  allUsers: "users",
} as const;

function versionsOf(tags: string[]) {
  return tags.map((tag) => store.tagVersions.get(tag) ?? 0);
}

function remove(key: string) {
  const entry = store.entries.get(key);
  if (!entry) return;
  store.entries.delete(key);
  for (const tag of entry.tags) store.tagIndex.get(tag)?.delete(key);
}

function save(key: string, value: unknown, options: CacheOptions) {
  remove(key);
  const now = Date.now();
  store.entries.set(key, { value, tags: options.tags, freshUntil: now + options.ttl * 1000, staleUntil: now + (options.ttl + (options.swr ?? 0)) * 1000 });
  for (const tag of options.tags) {
    let keys = store.tagIndex.get(tag);
    if (!keys) store.tagIndex.set(tag, (keys = new Set()));
    keys.add(key);
  }
  while (store.entries.size > MAX_ENTRIES) remove(store.entries.keys().next().value!);
}

function load<T>(key: string, options: CacheOptions, loader: () => Promise<T>): Promise<T> {
  const running = store.inflight.get(key);
  if (running) return running as Promise<T>;
  const before = versionsOf(options.tags);
  const promise = loader()
    .then((value) => {
      // Invalidated while loading → the value may predate the write; don't keep it.
      const after = versionsOf(options.tags);
      if (after.every((version, index) => version === before[index])) save(key, value, options);
      return value;
    })
    .finally(() => store.inflight.delete(key));
  store.inflight.set(key, promise);
  return promise;
}

/** Return the cached value for `key`, loading (once) on a miss and refreshing in the background when stale. */
export async function cached<T>(key: string, options: CacheOptions, loader: () => Promise<T>): Promise<T> {
  // SERVER_CACHE=off bypasses the cache entirely (debugging, A/B timing).
  if (process.env.SERVER_CACHE === "off") return loader();
  const entry = store.entries.get(key);
  const now = Date.now();
  if (entry && now < entry.staleUntil) {
    // Touch for LRU order.
    store.entries.delete(key);
    store.entries.set(key, entry);
    if (now < entry.freshUntil) {
      store.stats.hits += 1;
    } else {
      store.stats.stale += 1;
      void load(key, options, loader).catch(() => undefined);
    }
    return entry.value as T;
  }
  store.stats.misses += 1;
  return load(key, options, loader);
}

/** Drop every entry carrying any of these tags. */
export function invalidateTags(...tags: string[]) {
  for (const tag of tags) {
    store.tagVersions.set(tag, (store.tagVersions.get(tag) ?? 0) + 1);
    const keys = store.tagIndex.get(tag);
    if (!keys?.size) continue;
    store.stats.invalidations += 1;
    for (const key of [...keys]) remove(key);
  }
}

export function invalidateUser(userId: string) {
  invalidateTags(CacheTags.user(userId));
}

/** Hit/miss counters and size — for the profiler and debugging. */
export function cacheStats() {
  return { ...store.stats, entries: store.entries.size };
}
