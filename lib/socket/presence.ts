import type { Server as SocketServer, Socket } from "socket.io";
import { prisma } from "@/lib/prisma";
import { getChatRoomId, type CommunityChatChannelId } from "@/lib/community-chat";
import { canDirectMessage, getDmRoomId } from "@/lib/services/dm.service";
import { userRoom } from "@/lib/realtime/rooms";

/**
 * Presence and typing indicators.
 *
 * - Online: a user is online while any of their sockets is connected, on any server.
 *   Each server counts its own sockets per user (so several tabs don't flicker); before
 *   announcing "offline" it asks every server — through the Redis adapter — whether the
 *   user still has a tab open anywhere. Only people who could message them — friends
 *   and AI Match circle-mates — may watch their status.
 * - Typing: relayed only to others in the same DM conversation or chat channel room,
 *   which the sender must already have joined (so membership was checked on join).
 */

const globalForPresence = globalThis as unknown as { __entertainverseOnline?: Map<string, number> };
const online = (globalForPresence.__entertainverseOnline ??= new Map<string, number>());

const presenceRoom = (userId: string) => `presence:${userId}`;
const TYPING_GAP_MS = 300;
const MAX_WATCHED = 100;

/** Which of these users have a socket open on any server (one question to all servers). */
async function onlineAmong(io: SocketServer, userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  // Every socket joins its user's room on connect, so this finds them wherever they are.
  const sockets = await io.in(userIds.map(userRoom)).fetchSockets();
  return new Set(sockets.map((socket) => socket.data.userId as string));
}

async function displayName(socket: Socket, userId: string): Promise<string> {
  if (typeof socket.data.name === "string") return socket.data.name;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  socket.data.name = user?.name ?? "Someone";
  return socket.data.name as string;
}

export function registerPresenceHandlers(io: SocketServer, socket: Socket, userId: string) {
  const count = (online.get(userId) ?? 0) + 1;
  online.set(userId, count);
  if (count === 1) io.to(presenceRoom(userId)).emit("presence:update", { userId, online: true });

  // Per room, so typing in a DM doesn't swallow typing in a chat channel (or vice versa).
  const lastTypingAt = new Map<string, number>();
  const throttled = (room: string) => {
    const now = Date.now();
    if (now - (lastTypingAt.get(room) ?? 0) < TYPING_GAP_MS) return true;
    lastTypingAt.set(room, now);
    return false;
  };

  socket.on("presence:watch", async (payload: unknown) => {
    const ids = Array.isArray((payload as { userIds?: unknown })?.userIds) ? (payload as { userIds: unknown[] }).userIds : [];
    const wanted = [...new Set(ids.filter((id): id is string => typeof id === "string" && id !== userId))].slice(0, MAX_WATCHED);
    const allowed = (await Promise.all(wanted.map(async (id) => ((await canDirectMessage(userId, id).catch(() => false)) ? id : null)))).filter(
      (id): id is string => id !== null,
    );
    await Promise.all(allowed.map((id) => socket.join(presenceRoom(id))));
    const onlineNow = await onlineAmong(io, allowed);
    socket.emit("presence:state", { online: allowed.filter((id) => onlineNow.has(id)), watched: allowed });
  });

  socket.on("dm:typing", (payload: unknown) => {
    const { conversationId, typing } = (payload ?? {}) as { conversationId?: unknown; typing?: unknown };
    if (typeof conversationId !== "string") return;
    const room = getDmRoomId(conversationId);
    if (!socket.rooms.has(room) || (typing && throttled(room))) return;
    socket.to(room).emit("dm:typing", { conversationId, userId, typing: Boolean(typing) });
  });

  socket.on("chat:typing", async (payload: unknown) => {
    const { communitySlug, channel, typing } = (payload ?? {}) as { communitySlug?: unknown; channel?: unknown; typing?: unknown };
    if (typeof communitySlug !== "string" || (channel !== "general" && channel !== "anime")) return;
    const room = getChatRoomId(communitySlug.trim().toLowerCase(), channel as CommunityChatChannelId);
    if (!socket.rooms.has(room) || (typing && throttled(room))) return;
    socket.to(room).emit("chat:typing", { communitySlug, channel, userId, name: await displayName(socket, userId), typing: Boolean(typing) });
  });

  socket.on("disconnect", async () => {
    const left = (online.get(userId) ?? 1) - 1;
    if (left > 0) {
      online.set(userId, left);
      return;
    }
    online.delete(userId);
    // Their last tab on this server closed — they may still have one open on another.
    // (This socket has already left its rooms, so it isn't counted.)
    const stillOnline = await onlineAmong(io, [userId]).then((ids) => ids.size > 0, () => false);
    if (!stillOnline) io.to(presenceRoom(userId)).emit("presence:update", { userId, online: false });
  });
}
