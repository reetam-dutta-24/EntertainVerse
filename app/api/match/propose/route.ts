import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { MatchNotReadyError, proposeCircle } from "@/lib/services/match.service";

const bodySchema = z.object({
  /** People to leave out (e.g. removed from the last proposal). */
  exclude: z.array(z.string().max(40)).max(50).default([]),
});

/** POST /api/match/propose — the best circle for you right now (nothing is saved). */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    return NextResponse.json({ proposal: await proposeCircle(auth.userId, parsed.data.exclude) });
  } catch (error) {
    if (error instanceof MatchNotReadyError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("[match propose]", error);
    return NextResponse.json({ error: "Couldn't find matches right now." }, { status: 500 });
  }
}
