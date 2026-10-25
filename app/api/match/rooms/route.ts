import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { MatchNotReadyError, createRoom, listMyRooms, listRoomInvites, suggestRoom } from "@/lib/services/match.service";

const bodySchema = z.object({
  title: z.string().trim().min(2).max(60),
  topic: z.string().trim().max(120).optional(),
  scope: z.enum(["nearby", "country", "world"]),
  capacity: z.number().int().min(3).max(12).default(6),
});

/** GET /api/match/rooms — your rooms, open invites, and a suggested name for a new room. */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const [rooms, invites, suggestion] = await Promise.all([
    listMyRooms(auth.userId),
    listRoomInvites(auth.userId),
    suggestRoom(auth.userId),
  ]);
  return NextResponse.json({ rooms, invites, suggestion });
}

/** POST /api/match/rooms — open a room and invite everyone who matches (popup + notification). */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Give the room a name (2+ characters)." }, { status: 400 });
  try {
    const result = await createRoom(auth.userId, parsed.data);
    return NextResponse.json({ result, rooms: await listMyRooms(auth.userId) });
  } catch (error) {
    if (error instanceof MatchNotReadyError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("[match rooms POST]", error);
    return NextResponse.json({ error: "Couldn't open the room." }, { status: 500 });
  }
}
