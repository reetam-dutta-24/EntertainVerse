/**
 * Keeps every app server's in-memory cache honest. Each server caches on its own (fast,
 * and it holds things Redis can't, like embedding vectors), so when a write clears tags on
 * the server that handled it, the others must hear about it too — otherwise they keep
 * serving the old data until it expires.
 *
 * Invalidations are published on a Redis channel; every other server applies them locally.
 * Without REDIS_URL this does nothing (single server: the local clear is enough).
 *
 * Edge-safe on purpose: the cache module is reachable from the middleware (auth → Prisma),
 * which runs in the Edge runtime — so no Node built-ins here, and the Redis client is only
 * loaded when it's actually used.
 */

const CHANNEL = "ev:cache:invalidate";

// Per process, on globalThis: server.ts and Next's bundle load separate copies of this module.
const globalForSync = globalThis as unknown as { __entertainverseServerId?: string };
const SERVER_ID = (globalForSync.__entertainverseServerId ??= crypto.randomUUID());

const loadRedis = () => import("@/lib/redis").then(({ getRedis }) => getRedis());

/** Tell the other servers to drop these tags (fire-and-forget). */
export function publishInvalidation(tags: string[]) {
  if (!tags.length || !process.env.REDIS_URL) return;
  void loadRedis()
    .then((redis) => redis?.publish(CHANNEL, JSON.stringify({ from: SERVER_ID, tags })))
    .catch((error: Error) => console.error("[cache] couldn't publish invalidation:", error.message));
}

/** Apply other servers' invalidations to this server's cache. Returns false without Redis. */
export async function listenForInvalidations(apply: (tags: string[]) => void): Promise<boolean> {
  if (!process.env.REDIS_URL) return false;
  const redis = await loadRedis();
  if (!redis) return false;
  // A subscribed connection can't run other commands, so it gets its own.
  const subscriber = redis.duplicate();
  subscriber.on("error", (error: Error) => console.error("[cache sync]", error.message));
  await subscriber.connect();
  await subscriber.subscribe(CHANNEL, (message) => {
    try {
      const { from, tags } = JSON.parse(message) as { from: string; tags: string[] };
      // Our own messages come back too; we already cleared those locally.
      if (from !== SERVER_ID && Array.isArray(tags)) apply(tags);
    } catch {
      // Ignore malformed messages.
    }
  });
  return true;
}
