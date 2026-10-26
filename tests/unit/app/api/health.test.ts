import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: vi.fn() } }));
vi.mock("@/lib/redis", () => ({ getRedis: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { getRedis } = await import("@/lib/redis");
const { GET } = await import("@/app/api/health/route");
const { isDraining, shutDown } = await import("@/lib/server-lifecycle");

const ping = vi.fn();
const health = async () => {
  const response = await GET();
  return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
};

beforeEach(() => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }] as never);
  ping.mockResolvedValue("PONG");
  vi.mocked(getRedis).mockResolvedValue({ ping } as never);
  vi.stubEnv("SERVER_NAME", "a");
});

describe("GET /api/health", () => {
  it("is 200 when the database answers (single server: no Redis)", async () => {
    vi.stubEnv("REDIS_URL", "");
    const { status, body, cache } = await health();
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "ok", server: "a", checks: { database: "ok", redis: "off" } });
    expect(cache).toBe("no-store");
  });

  it("checks Redis too when the servers share it", async () => {
    vi.stubEnv("REDIS_URL", "redis://test");
    expect((await health()).body.checks).toEqual({ database: "ok", redis: "ok" });
    expect(ping).toHaveBeenCalled();

    ping.mockRejectedValue(new Error("connection lost"));
    const { status, body } = await health();
    expect(status).toBe(503);
    expect(body).toMatchObject({ status: "down", checks: { database: "ok", redis: "down" } });
  });

  it("is 503 when the database is down", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("ECONNREFUSED") as never);
    const { status, body } = await health();
    expect(status).toBe(503);
    expect(body.checks.database).toBe("down");
  });

  it("counts a check that hangs as down", async () => {
    vi.useFakeTimers();
    vi.mocked(prisma.$queryRaw).mockReturnValue(new Promise(() => undefined) as never);
    const pending = health();
    await vi.advanceTimersByTimeAsync(2000);
    expect((await pending).status).toBe(503);
    vi.useRealTimers();
  });
});

describe("shutting down", () => {
  it("fails the health check first, keeps serving while draining, then closes connections", async () => {
    vi.useFakeTimers();
    const io = { close: vi.fn(async () => undefined) };
    expect(isDraining()).toBe(false);

    const done = shutDown(io as never, 10_000);
    expect(isDraining()).toBe(true);
    expect((await health()).body).toEqual({ status: "draining", server: "a" });
    expect((await health()).status).toBe(503);

    // The load balancer needs a few checks to notice — connections stay open meanwhile.
    await vi.advanceTimersByTimeAsync(9_999);
    expect(io.close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(io.close).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
