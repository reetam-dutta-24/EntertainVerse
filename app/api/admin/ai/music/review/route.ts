import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMusicAdminApi } from "@/lib/admin-auth";
import { ruleOnlyReview } from "@/lib/ai/catalog-review";
import { checkMusicRules, reviewMusicForm } from "@/lib/ai/music-review";
import { streamAiTask } from "@/lib/ai/progress-stream";
import { isAiConfigured } from "@/lib/ai/provider";
import type { MusicFormInput } from "@/lib/validators/admin/music";

const bodySchema = z.object({
  // The reviewer reports schema problems itself, so accept the raw form shape.
  form: z.record(z.string(), z.unknown()),
  facts: z.record(z.string(), z.unknown()).optional(),
  verifyOnline: z.boolean().optional(),
});

/** POST /api/admin/ai/music/review — check a song form before publishing, streaming progress. */
export async function POST(request: Request) {
  const denied = await requireMusicAdminApi();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }
  const form = parsed.data.form as unknown as MusicFormInput;

  if (!isAiConfigured()) {
    return streamAiTask("admin ai music review", async () => ruleOnlyReview(checkMusicRules(form)));
  }

  const { facts, verifyOnline } = parsed.data;
  return streamAiTask("admin ai music review", (report) => reviewMusicForm(form, { facts, verifyOnline }, report));
}
