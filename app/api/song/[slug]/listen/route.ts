import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { recordListenMinutes } from "@/lib/services/activity-tracking.service";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const bodySchema = z.object({
  /** Session from the previous report; omit to start a new listening session. */
  sessionId: z.string().max(40).optional(),
  minutes: z.number().min(0.5).max(5).default(1),
});

/** POST /api/song/:slug/listen — played minutes of a track (real playback time). */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { slug } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid listen report." }, { status: 400 });

  try {
    const result = await recordListenMinutes(auth.userId, slug, parsed.data);
    if (!result) return NextResponse.json({ error: "Track not found." }, { status: 404 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[song listen POST]", error);
    return NextResponse.json({ error: "Could not record listening." }, { status: 500 });
  }
}
