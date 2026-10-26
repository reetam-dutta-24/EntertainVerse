import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import { iceServersFromEnv } from "@/lib/realtime/ice-servers";

/** GET /api/realtime/ice — STUN/TURN servers for talk rooms and live hosting (signed-in users only). */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  return NextResponse.json({ iceServers: iceServersFromEnv() }, { headers: { "Cache-Control": "no-store" } });
}
