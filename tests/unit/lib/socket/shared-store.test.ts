import { describe, expect, it } from "vitest";
import { createMemoryStore, createRedisStore, type SharedStore } from "@/lib/socket/shared-store";
import type { RedisClient } from "@/lib/redis";

const pause = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 3));

/** Just enough of Redis for the store: GET, SET (NX / expiry), DEL and the lock-release script. */
function fakeRedis() {
  const data = new Map<string, string>();
  const client = {
    async get(key: string) {
      await pause();
      return data.get(key) ?? null;
    },
    async set(key: string, value: string, options?: { condition?: string }) {
      await pause();
      if (options?.condition === "NX" && data.has(key)) return null;
      data.set(key, value);
      return "OK";
    },
    async del(key: string) {
      data.delete(key);
      return 1;
    },
    async eval(_script: string, { keys, arguments: args }: { keys: string[]; arguments: string[] }) {
      if (data.get(keys[0]!) !== args[0]) return 0;
      data.delete(keys[0]!);
      return 1;
    },
  };
  return { client: client as unknown as RedisClient, data };
}

describe.each([
  ["memory", () => createMemoryStore()],
  ["redis", () => createRedisStore(fakeRedis().client)],
] as [string, () => SharedStore][])("%s store", (_, makeStore) => {
  it("never loses an update when many arrive at once (the lock makes them take turns)", async () => {
    const store = makeStore();
    // Without the lock, reads would interleave and most increments would overwrite each other.
    await Promise.all(
      Array.from({ length: 50 }, () =>
        store.update<{ count: number }>("party:x", async (current) => {
          await pause();
          return { count: (current?.count ?? 0) + 1 };
        }),
      ),
    );
    expect(await store.get("party:x")).toEqual({ count: 50 });
  });

  it("saves a value, leaves it on undefined, deletes it on null", async () => {
    const store = makeStore();
    await store.update("k", () => ({ a: 1 }));
    expect(await store.update("k", () => undefined)).toBeUndefined();
    expect(await store.get("k")).toEqual({ a: 1 });
    await store.update("k", () => null);
    expect(await store.get("k")).toBeNull();
  });

  it("hands each update its own copy, so a failed change saves nothing", async () => {
    const store = makeStore();
    await store.update("k", () => ({ members: ["aisha"] }));
    await expect(
      store.update<{ members: string[] }>("k", (current) => {
        current!.members.push("vikram");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await store.get("k")).toEqual({ members: ["aisha"] });
  });

  it("keeps working after a change throws (the lock is released)", async () => {
    const store = makeStore();
    await store.update("k", () => {
      throw new Error("boom");
    }).catch(() => {});
    await store.update("k", () => ({ ok: true }));
    expect(await store.get("k")).toEqual({ ok: true });
  });
});
