import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMusicAdminApi } from "@/lib/admin-auth";
import { streamAiTask } from "@/lib/ai/progress-stream";
import { isAiConfigured } from "@/lib/ai/provider";
import { importMusicFromSource, importMusicFromWeb } from "@/lib/ai/music-import";

const bodySchema = z.union([
  z.object({
    mode: z.literal("source"),
    source: z.enum(["itunes", "deezer"]),
    sourceId: z.string().trim().min(1).max(40),
  }),
  z.object({
    mode: z.literal("web"),
    query: z.string().trim().min(2).max(160),
    typeHint: z.enum(["song", "ost"]).optional(),
  }),
]);

/** POST /api/admin/ai/music/import — build a pre-filled song draft, streaming progress. */
export async function POST(request: Request) {
  const denied = await requireMusicAdminApi();
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
  return streamAiTask("admin ai music import", (report) =>
    input.mode === "source"
      ? importMusicFromSource(input, report)
      : importMusicFromWeb(input.query, input.typeHint, report),
  );
}
