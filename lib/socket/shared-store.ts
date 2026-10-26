import { randomUUID } from "node:crypto";
import { getRedis, type RedisClient } from "@/lib/redis";

/**
 * Small key → JSON store for live state that every app server must see the same way
 * (watch parties, talk rooms). Redis-backed when REDIS_URL is set, in-memory otherwise.
 *
 * `update` is a locked read-modify-write: two servers changing the same party at the same
 * moment take turns, so neither overwrites the other's change.
 */
export interface SharedStore {
  get<T>(key: string): Promise<T | null>;
  /**
   * Runs `change` on the current value (null if none) while holding the key's lock.
   * `change` returns the new value to save, null to delete the key, or undefined to
   * leave it untouched. Resolves to whatever `change` returned.
   */
  update<T>(key: string, change: (current: T | null) => T | null | undefined | Promise<T | null | undefined>): Promise<T | null | undefined>;
}

/** Abandoned state (e.g. every server crashed mid-party) expires on its own. */
const TTL_SECONDS = 24 * 60 * 60;
/** Longest a lock may be held — a crash can't leave a party locked forever. */
const LOCK_MS = 5_000;
const LOCK_ATTEMPTS = 200;
/** Delete the lock only if it's still ours (it may have expired and been taken). */
const RELEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

export function createRedisStore(redis: RedisClient, prefix = "ev:"): SharedStore {
  const read = async <T>(key: string) => {
    const raw = await redis.get(prefix + key);
    return raw ? (JSON.parse(raw) as T) : null;
  };

  return {
    get: read,
    async update(key, change) {
      const lockKey = `${prefix}${key}:lock`;
      const token = randomUUID();
      for (let attempt = 0; ; attempt++) {
        const acquired = await redis.set(lockKey, token, { condition: "NX", expiration: { type: "PX", value: LOCK_MS } });
        if (acquired) break;
        if (attempt >= LOCK_ATTEMPTS) throw new Error("This room is busy — try again.");
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20));
      }
      try {
        const next = await change(await read(key));
        if (next === null) await redis.del(prefix + key);
        else if (next !== undefined) await redis.set(prefix + key, JSON.stringify(next), { expiration: { type: "EX", value: TTL_SECONDS } });
        return next;
      } finally {
        await redis.eval(RELEASE_SCRIPT, { keys: [lockKey], arguments: [token] });
      }
    },
  };
}

/** Single-server fallback: same contract, updates to one key run one after another. */
export function createMemoryStore(): SharedStore {
  const data = new Map<string, string>();
  const queues = new Map<string, Promise<unknown>>();
  // Stored as JSON so callers never share (and accidentally mutate) the saved object.
  const read = <T>(key: string) => {
    const raw = data.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  };

  return {
    get: async (key) => read(key),
    update(key, change) {
      const run = (queues.get(key) ?? Promise.resolve()).then(async () => {
        const next = await change(read(key));
        if (next === null) data.delete(key);
        else if (next !== undefined) data.set(key, JSON.stringify(next));
        return next;
      });
      const settled = run.catch(() => undefined);
      queues.set(key, settled);
      void settled.then(() => {
        if (queues.get(key) === settled) queues.delete(key);
      });
      return run;
    },
  };
}

const globalForStore = globalThis as unknown as { __entertainverseSharedStore?: Promise<SharedStore> };

/** Redis when configured, memory otherwise. */
export function getSharedStore(): Promise<SharedStore> {
  globalForStore.__entertainverseSharedStore ??= getRedis().then((redis) => (redis ? createRedisStore(redis) : createMemoryStore()));
  return globalForStore.__entertainverseSharedStore;
}
