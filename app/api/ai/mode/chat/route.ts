import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { asCatalogAiError } from "@/lib/ai/errors";
import { chatTurn } from "@/lib/ai/ai-mode-chat";
import { isAiConfigured } from "@/lib/ai/provider";
import { listenPrefsSchema, watchPrefsSchema } from "@/lib/ai-profile/schema";

const messages = z
  .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(600) }))
  .min(1)
  .max(24);

const bodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("watch"), messages, prefs: watchPrefsSchema }),
  z.object({ mode: z.literal("listen"), messages, prefs: listenPrefsSchema }),
]);

/** POST /api/ai/mode/chat — one AI-mode chat turn: reply + updated answers. */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI chat isn't available right now — try the taste quiz instead." }, { status: 503 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid chat message." }, { status: 400 });

  try {
    const { mode, messages: history, prefs } = parsed.data;
    const turn = mode === "watch" ? await chatTurn("watch", history, prefs) : await chatTurn("listen", history, prefs);
    return NextResponse.json(turn);
  } catch (error) {
    const aiError = asCatalogAiError(error);
    console.error("[ai mode chat]", error);
    return NextResponse.json({ error: aiError.message }, { status: aiError.status });
  }
}
