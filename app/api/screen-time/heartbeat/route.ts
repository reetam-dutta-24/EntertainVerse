import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import { recordHeartbeat } from "@/lib/services/screen-time.service";

/** POST /api/screen-time/heartbeat — one visible-tab minute; returns the updated status. */
export async function POST() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  return NextResponse.json({ status: await recordHeartbeat(auth.userId) });
}
