import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import {
  MatchNotReadyError,
  declineRoom,
  joinRoom,
  leaveRoom,
  listMyRooms,
  listRoomInvites,
  markRoomInviteSeen,
} from "@/lib/services/match.service";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({ action: z.enum(["join", "decline", "leave", "seen"]) });

/** PATCH /api/match/rooms/:id — join (one tap), decline, leave, or mark the popup seen. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const { id } = await context.params;
  try {
    const { action } = parsed.data;
    if (action === "join") await joinRoom(auth.userId, id);
    else if (action === "decline") await declineRoom(auth.userId, id);
    else if (action === "leave") await leaveRoom(auth.userId, id);
    else await markRoomInviteSeen(auth.userId, id);
    const [rooms, invites] = await Promise.all([listMyRooms(auth.userId), listRoomInvites(auth.userId)]);
    return NextResponse.json({ rooms, invites });
  } catch (error) {
    if (error instanceof MatchNotReadyError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("[match rooms PATCH]", error);
    return NextResponse.json({ error: "Couldn't update the room." }, { status: 500 });
  }
}
