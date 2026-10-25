import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { getMatchProfile, leaveMatching, saveMatchProfile } from "@/lib/services/match.service";

const putSchema = z.object({
  enabled: z.boolean().default(true),
  scope: z.enum(["nearby", "country", "world"]),
  /** Rounded to ~10 km on the server; null clears a stored location. */
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  country: z.string().trim().length(2).nullable().optional(),
  intro: z.string().max(160).optional(),
  groupSize: z.number().int().min(3).max(6).default(4),
});

/** GET /api/match/profile — your AI Match settings (null when not opted in). */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  return NextResponse.json({ profile: await getMatchProfile(auth.userId) });
}

/** PUT /api/match/profile — opt in or update scope, location, intro, group size. */
export async function PUT(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = putSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, { status: 400 });
  return NextResponse.json({ profile: await saveMatchProfile(auth.userId, parsed.data) });
}

/** DELETE /api/match/profile — stop being matched (and forget the location). */
export async function DELETE() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  await leaveMatching(auth.userId);
  return NextResponse.json({ profile: null });
}
