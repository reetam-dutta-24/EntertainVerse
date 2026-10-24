import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContentAdminApi } from "@/lib/admin-auth";
import { streamAiTask } from "@/lib/ai/progress-stream";
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

/** POST /api/admin/ai/content/import — build a pre-filled content draft, streaming progress. */
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

  const input = parsed.data;
  // Streams NDJSON progress lines, then the draft (or an error line).
  return streamAiTask("admin ai import", (report) =>
    input.mode === "source"
      ? importFromSource(input, report)
      : importFromWeb(input.query, input.typeHint, report),
  );
}
