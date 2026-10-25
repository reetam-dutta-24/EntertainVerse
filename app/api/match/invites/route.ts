import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import { listRoomInvites } from "@/lib/services/match.service";

/** GET /api/match/invites?unseen=1 — open room invites (unseen only, for the popup). */
export async function GET(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const unseenOnly = new URL(request.url).searchParams.get("unseen") === "1";
  return NextResponse.json({ invites: await listRoomInvites(auth.userId, { unseenOnly }) });
}
