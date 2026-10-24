import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { streamAiTask } from "@/lib/ai/progress-stream";
import { generateRoadmap, getActiveRoadmapView } from "@/lib/services/roadmap.service";

const modeSchema = z.enum(["watch", "listen"]);
const bodySchema = z.object({
  mode: modeSchema,
  /** Adjust-chat request; omit to build a fresh roadmap. */
  instruction: z.string().trim().min(2).max(300).optional(),
});

/** GET /api/ai/roadmaps?mode=watch — the active roadmap (progress synced). */
export async function GET(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const mode = modeSchema.safeParse(new URL(request.url).searchParams.get("mode") ?? "watch");
  if (!mode.success) return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  return NextResponse.json({ roadmap: await getActiveRoadmapView(auth.userId, mode.data) });
}

/** POST /api/ai/roadmaps — build or adjust a roadmap, streaming progress (NDJSON). */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid roadmap request." }, { status: 400 });

  const { mode, instruction } = parsed.data;
  return streamAiTask("ai roadmap", (report) => generateRoadmap(auth.userId, mode, { instruction }, report));
}
