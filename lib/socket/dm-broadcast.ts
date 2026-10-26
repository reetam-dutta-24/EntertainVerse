import { prisma } from "@/lib/prisma";
import { userRoom } from "@/lib/realtime/rooms";
import { getDmRoomId } from "@/lib/services/dm.service";
import { getSocketServer } from "@/lib/socket/io-instance";

/**
 * Send a DM event to both participants on every tab they have open — not just to sockets
 * that joined the conversation's room — so inboxes and previews update even when that
 * conversation isn't open. `isOwn` is per-viewer, so it's never broadcast.
 */
export async function broadcastDmEvent(conversationId: string, event: "dm:message" | "dm:edited" | "dm:deleted", payload: object) {
  const io = getSocketServer();
  if (!io) return;
  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
    select: { participantLowId: true, participantHighId: true },
  });
  const rooms = [getDmRoomId(conversationId)];
  if (conversation) rooms.push(userRoom(conversation.participantLowId), userRoom(conversation.participantHighId));
  const { isOwn: _isOwn, ...shared } = payload as { isOwn?: boolean };
  void _isOwn;
  io.to(rooms).emit(event, shared);
}
