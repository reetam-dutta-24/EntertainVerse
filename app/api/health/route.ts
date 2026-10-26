import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { isDraining } from "@/lib/server-lifecycle";

/** A check that hangs counts as down — the load balancer won't wait long either. */
const CHECK_TIMEOUT_MS = 2000;

type CheckResult = "ok" | "down" | "off";

async function check(run: () => Promise<unknown>): Promise<CheckResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timed out")), CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([run(), timeout]);
    return "ok";
  } catch {
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /api/health — the load balancer asks every few seconds whether this server should get
 * traffic. 200 when it can serve real pages (database and, with several servers, Redis
 * answer); 503 when it can't, or while it's shutting down.
 */
export async function GET() {
  const server = process.env.SERVER_NAME;
  const headers = { "Cache-Control": "no-store" };
  if (isDraining()) {
    return NextResponse.json({ status: "draining", server }, { status: 503, headers });
  }

  const [database, redis] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`),
    process.env.REDIS_URL ? check(async () => (await getRedis())?.ping()) : ("off" as const),
  ]);
  const healthy = database === "ok" && redis !== "down";

  return NextResponse.json(
    { status: healthy ? "ok" : "down", server, checks: { database, redis }, uptimeSeconds: Math.round(process.uptime()) },
    { status: healthy ? 200 : 503, headers },
  );
}
