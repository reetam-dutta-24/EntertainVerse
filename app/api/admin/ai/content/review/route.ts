import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContentAdminApi } from "@/lib/admin-auth";
import { asCatalogAiError } from "@/lib/ai/errors";
import { isAiConfigured } from "@/lib/ai/provider";
import { checkContentRules, reviewContentForm } from "@/lib/ai/content-review";
import type { ContentFormInput } from "@/lib/validators/admin/content";

const bodySchema = z.object({
  // The reviewer reports schema problems itself, so accept the raw form shape.
  form: z.record(z.string(), z.unknown()),
  facts: z.record(z.string(), z.unknown()).optional(),
  verifyOnline: z.boolean().optional(),
});

/** POST /api/admin/ai/content/review — check a content form before publishing. */
export async function POST(request: Request) {
  const denied = await requireContentAdminApi();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }
  const form = parsed.data.form as unknown as ContentFormInput;

  // Without an AI provider, still return the rule-based checks.
  if (!isAiConfigured()) {
    return NextResponse.json({
      review: {
        summary: "Automatic checks only — add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to enable the AI review.",
        issues: checkContentRules(form),
        checkedOnline: false,
        sources: [],
      },
    });
  }

  try {
    const review = await reviewContentForm(form, {
      facts: parsed.data.facts,
      verifyOnline: parsed.data.verifyOnline,
    });
    return NextResponse.json({ review });
  } catch (error) {
    const aiError = asCatalogAiError(error);
    console.error("[admin ai review]", error);
    return NextResponse.json({ error: aiError.message }, { status: aiError.status });
  }
}
