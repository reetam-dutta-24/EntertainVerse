import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { recordWatchMinutes } from "@/lib/services/activity-tracking.service";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const bodySchema = z.object({
  /** Session from the previous report; omit to start a new viewing session. */
  sessionId: z.string().max(40).optional(),
  minutes: z.number().min(0.5).max(5).default(1),
});

/** POST /api/content/:slug/watch-event — one more watched minute (or start a session). */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { slug } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid watch report." }, { status: 400 });

  try {
    const result = await recordWatchMinutes(auth.userId, slug, parsed.data);
    if (!result) return NextResponse.json({ error: "Title not found." }, { status: 404 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[content watch-event POST]", error);
    return NextResponse.json({ error: "Could not record watch event." }, { status: 500 });
  }
}
