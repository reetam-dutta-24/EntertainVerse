import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { streamAiTask } from "@/lib/ai/progress-stream";
import { isAiConfigured } from "@/lib/ai/provider";
import { generateRecap, getRecapOptions } from "@/lib/ai/recap";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const bodySchema = z.object({
  season: z.number().int().min(1).max(100).optional(),
  episode: z.number().int().min(1).max(2000).optional(),
  percent: z.number().int().min(5).max(100).optional(),
  depth: z.enum(["quick", "standard", "detailed"]),
});

/** GET /api/content/:slug/recap — what to ask (seasons / film) and where we think they stopped. */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const { slug } = await context.params;
  const options = await getRecapOptions(auth.userId, slug);
  if (!options) return NextResponse.json({ error: "Title not found." }, { status: 404 });
  return NextResponse.json({ options });
}

/** POST /api/content/:slug/recap — spoiler-safe "Catch me up" recap, streaming progress. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  if (!isAiConfigured()) return NextResponse.json({ error: "AI recaps aren't set up on this server yet." }, { status: 503 });

  const { slug } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid recap request." }, { status: 400 });

  return streamAiTask("content recap", (report) => generateRecap(slug, parsed.data, report));
}
