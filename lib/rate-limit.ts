import { randomUUID } from "node:crypto";
import { getRedis } from "@/lib/redis";

/**
 * Sliding-window rate limit: at most `max` hits per `windowMs` for each key.
 *
 * With several app servers, every server must count the same hits — otherwise a user's
 * limit is multiplied by the number of servers. So with REDIS_URL each hit is a member of
 * a Redis sorted set scored by time; without it, a per-process map (single server).
 */
export interface RateLimit {
  /** Records a hit and returns true if it goes over the limit (the hit is then not counted). */
  hit(key: string): Promise<boolean>;
}

export function createRateLimit(name: string, max: number, windowMs: number): RateLimit {
  const memory = new Map<string, number[]>();

  const hitInMemory = (key: string) => {
    const now = Date.now();
    // Forget users whose window has fully passed, so the map can't grow with every user ever seen.
    if (memory.size > 500) {
      for (const [id, stamps] of memory) if (now - stamps[stamps.length - 1]! >= windowMs) memory.delete(id);
    }
    const times = (memory.get(key) ?? []).filter((at) => now - at < windowMs);
    if (times.length >= max) return true;
    times.push(now);
    memory.set(key, times);
    return false;
  };

  return {
    async hit(key) {
      const redis = await getRedis();
      if (!redis) return hitInMemory(key);

      const redisKey = `ev:ratelimit:${name}:${key}`;
      const now = Date.now();
      const member = `${now}-${randomUUID()}`;
      // One round trip, applied as a unit: drop old hits, add this one, count.
      const [, , count] = await redis
        .multi()
        .zRemRangeByScore(redisKey, 0, now - windowMs)
        .zAdd(redisKey, { score: now, value: member })
        .zCard(redisKey)
        .pExpire(redisKey, windowMs)
        .exec();
      if (Number(count) <= max) return false;
      // Over the limit: don't let a refused request use up a slot.
      await redis.zRem(redisKey, member);
      return true;
    },
  };
}
