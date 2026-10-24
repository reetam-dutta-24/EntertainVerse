import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContentAdminApi } from "@/lib/admin-auth";
import { asCatalogAiError } from "@/lib/ai/errors";
import { isAiConfigured } from "@/lib/ai/provider";
import { importFromSource, importFromWeb } from "@/lib/ai/content-import";

const bodySchema = z.union([
  z.object({
    mode: z.literal("source"),
    source: z.enum(["tmdb", "anilist"]),
    sourceId: z.string().trim().min(1).max(40),
    tmdbKind: z.enum(["movie", "tv"]).optional(),
  }),
  z.object({
    mode: z.literal("web"),
    query: z.string().trim().min(2).max(160),
    typeHint: z.enum(["anime", "show", "movie", "documentary", "kdrama"]).optional(),
  }),
]);

/** POST /api/admin/ai/content/import — build a pre-filled content draft. */
export async function POST(request: Request) {
  const denied = await requireContentAdminApi();
  if (denied) return denied;

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI import isn't set up yet — add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import request." }, { status: 400 });
  }

  try {
    const result =
      parsed.data.mode === "source"
        ? await importFromSource(parsed.data)
        : await importFromWeb(parsed.data.query, parsed.data.typeHint);
    return NextResponse.json({ result });
  } catch (error) {
    const aiError = asCatalogAiError(error);
    console.error("[admin ai import]", error);
    return NextResponse.json({ error: aiError.message }, { status: aiError.status });
  }
}
