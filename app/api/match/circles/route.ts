import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { MatchNotReadyError, createCircle, listMyCircles } from "@/lib/services/match.service";

const bodySchema = z.object({
  title: z.string().trim().min(2).max(60),
  vibe: z.string().trim().max(120).default(""),
  memberIds: z.array(z.string().max(40)).min(1).max(5),
});

/** GET /api/match/circles — your circles and invitations. */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  return NextResponse.json({ circles: await listMyCircles(auth.userId) });
}

/** POST /api/match/circles — create a circle from a proposal and invite its members. */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid circle." }, { status: 400 });
  try {
    await createCircle(auth.userId, parsed.data);
    return NextResponse.json({ circles: await listMyCircles(auth.userId) });
  } catch (error) {
    if (error instanceof MatchNotReadyError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("[match circles POST]", error);
    return NextResponse.json({ error: "Couldn't create the circle." }, { status: 500 });
  }
}
