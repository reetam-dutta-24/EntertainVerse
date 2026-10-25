import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { MatchNotReadyError, listMyCircles, respondToCircle } from "@/lib/services/match.service";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({ action: z.enum(["accept", "decline", "leave"]) });

/** PATCH /api/match/circles/:id — accept or decline an invitation, or leave a circle. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const { id } = await context.params;
  try {
    await respondToCircle(auth.userId, id, parsed.data.action);
    return NextResponse.json({ circles: await listMyCircles(auth.userId) });
  } catch (error) {
    if (error instanceof MatchNotReadyError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("[match circles PATCH]", error);
    return NextResponse.json({ error: "Couldn't update the circle." }, { status: 500 });
  }
}
