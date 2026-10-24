import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { listenPrefsSchema, watchPrefsSchema } from "@/lib/ai-profile/schema";
import { getAiModePicks } from "@/lib/services/ai-mode.service";
import { saveAiProfile } from "@/lib/services/ai-profile.service";

const bodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("watch"), prefs: watchPrefsSchema.optional() }),
  z.object({ mode: z.literal("listen"), prefs: listenPrefsSchema.optional() }),
]);

/** POST /api/ai/mode/picks — save the quiz/chat answers for this mode, then return picks. */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers." }, { status: 400 });

  const body = parsed.data;
  if (body.prefs) {
    await saveAiProfile(auth.userId, body.mode === "watch" ? { watch: body.prefs } : { listen: body.prefs });
  }
  return NextResponse.json({ picks: await getAiModePicks(auth.userId, body.mode) });
}
