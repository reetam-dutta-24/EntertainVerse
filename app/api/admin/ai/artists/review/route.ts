import { NextResponse } from "next/server";
import { z } from "zod";
import { requireArtistAdminApi } from "@/lib/admin-auth";
import { ruleOnlyReview } from "@/lib/ai/catalog-review";
import { checkArtistRules, reviewArtistForm } from "@/lib/ai/artist-review";
import { streamAiTask } from "@/lib/ai/progress-stream";
import { isAiConfigured } from "@/lib/ai/provider";
import type { ArtistFormInput } from "@/lib/validators/admin/artist";

const bodySchema = z.object({
  // The reviewer reports schema problems itself, so accept the raw form shape.
  form: z.record(z.string(), z.unknown()),
  facts: z.record(z.string(), z.unknown()).optional(),
  verifyOnline: z.boolean().optional(),
});

/** POST /api/admin/ai/artists/review — check an artist form before publishing, streaming progress. */
export async function POST(request: Request) {
  const denied = await requireArtistAdminApi();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }
  const form = parsed.data.form as unknown as ArtistFormInput;

  if (!isAiConfigured()) {
    return streamAiTask("admin ai artist review", async () => ruleOnlyReview(checkArtistRules(form)));
  }

  const { facts, verifyOnline } = parsed.data;
  return streamAiTask("admin ai artist review", (report) => reviewArtistForm(form, { facts, verifyOnline }, report));
}
