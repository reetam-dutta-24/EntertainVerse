import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { listenPrefsSchema, watchPrefsSchema } from "@/lib/ai-profile/schema";
import { getAiProfile, saveAiProfile, wipeAiProfile } from "@/lib/services/ai-profile.service";

const patchSchema = z
  .object({
    watch: watchPrefsSchema.optional(),
    listen: listenPrefsSchema.optional(),
    learnFromActivity: z.boolean().optional(),
  })
  .refine((body) => body.watch || body.listen || body.learnFromActivity !== undefined, "Nothing to update.");

/** GET /api/ai/profile — what AI mode knows about the signed-in user. */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  return NextResponse.json({ profile: await getAiProfile(auth.userId) });
}

/** PATCH /api/ai/profile — edit answers or the learning switch. */
export async function PATCH(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }
  return NextResponse.json({ profile: await saveAiProfile(auth.userId, parsed.data) });
}

/** DELETE /api/ai/profile — forget every AI-mode answer and setting. */
export async function DELETE() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  await wipeAiProfile(auth.userId);
  return NextResponse.json({ profile: await getAiProfile(auth.userId) });
}
