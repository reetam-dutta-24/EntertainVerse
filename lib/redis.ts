import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

/**
 * The app's general-purpose Redis connection (shared state across app servers), or null
 * when REDIS_URL isn't set — single-server mode, where callers fall back to memory.
 *
 * Kept on globalThis like the Socket.IO server: server.ts and Next's bundled routes load
 * separate copies of this module, and they should share one connection.
 */
const globalForRedis = globalThis as unknown as { __entertainverseRedis?: Promise<RedisClient | null> };

export function getRedis(): Promise<RedisClient | null> {
  globalForRedis.__entertainverseRedis ??= connect();
  return globalForRedis.__entertainverseRedis;
}

async function connect(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = createClient({ url });
  // Without a listener a dropped connection would crash the process; the client reconnects.
  client.on("error", (error: Error) => console.error("[redis]", error.message));
  await client.connect();
  return client;
}
