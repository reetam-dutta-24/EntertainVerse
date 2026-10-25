import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { getScreenTimeStatus, updateDailyLimit } from "@/lib/services/screen-time.service";

const putSchema = z.object({
  /** Minutes per day (15 min – 12 h), or null to switch off (applies tomorrow). */
  dailyLimitMinutes: z.number().int().min(15).max(720).nullable(),
  timezone: z.string().max(64).optional(),
});

/** GET /api/screen-time — today's usage and the daily limit. */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  return NextResponse.json({ status: await getScreenTimeStatus(auth.userId) });
}

/** PUT /api/screen-time — set / lower (now), raise / switch off (from tomorrow). */
export async function PUT(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = putSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick a limit between 15 minutes and 12 hours." }, { status: 400 });
  const change = await updateDailyLimit(auth.userId, parsed.data.dailyLimitMinutes, parsed.data.timezone);
  return NextResponse.json(change);
}
