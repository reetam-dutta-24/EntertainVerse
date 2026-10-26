import { beforeEach, describe, expect, it, vi } from "vitest";

/** A pretend Redis: published messages reach every subscriber, like the real channel. */
const subscribers: ((message: string) => void)[] = [];
const published: string[] = [];
const fakeRedis = {
  publish: vi.fn(async (_channel: string, message: string) => {
    published.push(message);
    for (const deliver of subscribers) deliver(message);
  }),
  duplicate: () => ({
    on: () => undefined,
    connect: async () => undefined,
    subscribe: async (_channel: string, onMessage: (message: string) => void) => {
      subscribers.push(onMessage);
    },
  }),
};
vi.mock("@/lib/redis", () => ({ getRedis: vi.fn(async () => (process.env.REDIS_URL ? fakeRedis : null)) }));

const { listenForInvalidations, publishInvalidation } = await import("@/lib/cache/cross-server");
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  subscribers.length = 0;
  published.length = 0;
});

describe("cache invalidation across servers", () => {
  it("does nothing without Redis (single server)", async () => {
    expect(await listenForInvalidations(() => undefined)).toBe(false);
    publishInvalidation(["catalog"]);
    await flush();
    expect(published).toEqual([]);
  });

  it("applies another server's invalidation and ignores its own", async () => {
    vi.stubEnv("REDIS_URL", "redis://test");
    const applied: string[][] = [];
    expect(await listenForInvalidations((tags) => applied.push(tags))).toBe(true);

    // This server's own message comes back over the channel — already handled locally.
    publishInvalidation(["catalog"]);
    await flush();
    expect(published).toHaveLength(1);
    expect(applied).toEqual([]);

    // A message from another server is applied here.
    subscribers[0]!(JSON.stringify({ from: "other-server", tags: ["communities", "user:u1"] }));
    expect(applied).toEqual([["communities", "user:u1"]]);
  });

  it("ignores malformed messages", async () => {
    vi.stubEnv("REDIS_URL", "redis://test");
    const apply = vi.fn();
    await listenForInvalidations(apply);
    subscribers[0]!("not json");
    subscribers[0]!(JSON.stringify({ from: "other-server", tags: "catalog" }));
    expect(apply).not.toHaveBeenCalled();
  });
});
