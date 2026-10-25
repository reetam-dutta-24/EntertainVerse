import type { Server as HttpServer } from "node:http";
import type { Socket } from "socket.io";
import { Server as SocketServer } from "socket.io";
import { getToken } from "next-auth/jwt";
import {
  chatChannelToPrisma,
  getChatRoomId,
  type CommunityChatChannelId,
} from "@/lib/community-chat";
import {
  assertCommunityChatMember,
  createCommunityChatMessage,
} from "@/lib/services/community-chat.service";
import { communityChatSendSchema } from "@/lib/validators/community-chat";
import { setSocketServer } from "@/lib/socket/io-instance";
import { registerPartyHandlers } from "@/lib/socket/parties";

interface ChatJoinPayload {
  communitySlug: string;
  channel: CommunityChatChannelId;
}

interface ChatSendPayload extends ChatJoinPayload {
  content: string;
  attachment?: {
    url: string;
    name: string;
    kind: "image" | "file";
  };
}

function isChatChannel(value: unknown): value is CommunityChatChannelId {
  return value === "general" || value === "anime";
}

function parseJoinPayload(payload: unknown): ChatJoinPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (typeof data.communitySlug !== "string" || !isChatChannel(data.channel)) {
    return null;
  }
  return {
    communitySlug: data.communitySlug.trim().toLowerCase(),
    channel: data.channel,
  };
}

function parseSendPayload(payload: unknown): ChatSendPayload | null {
  const join = parseJoinPayload(payload);
  if (!join) return null;

  const data = payload as Record<string, unknown>;
  const parsed = communityChatSendSchema.safeParse({
    content: typeof data.content === "string" ? data.content : "",
    attachment: data.attachment,
  });

  if (!parsed.success) return null;

  return {
    ...join,
    content: parsed.data.content,
    attachment: parsed.data.attachment,
  };
}

async function authenticateSocket(socket: Socket): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const cookie = socket.handshake.headers.cookie;
  if (!cookie) return null;

  const token = await getToken({
    req: { headers: { cookie } } as { headers: { cookie: string } },
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });

  return typeof token?.id === "string" ? token.id : null;
}

export function attachSocketServer(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    path: "/api/socket/io",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const userId = await authenticateSocket(socket);
    if (!userId) {
      next(new Error("Unauthorized"));
      return;
    }
    socket.data.userId = userId;
    next();
  });

  setSocketServer(io);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const joinedRooms = new Set<string>();
    // Watch / listen parties and talk rooms.
    registerPartyHandlers(io, socket, userId);

    socket.on("chat:join", async (payload: unknown) => {
      const parsed = parseJoinPayload(payload);
      if (!parsed) {
        socket.emit("chat:error", { message: "Invalid chat room." });
        return;
      }

      try {
        await assertCommunityChatMember(userId, parsed.communitySlug);
        const roomId = getChatRoomId(parsed.communitySlug, parsed.channel);
        await socket.join(roomId);
        joinedRooms.add(roomId);
      } catch (error) {
        socket.emit("chat:error", {
          message:
            error instanceof Error
              ? error.message
              : "Could not join chat room.",
        });
      }
    });

    socket.on("chat:leave", (payload: unknown) => {
      const parsed = parseJoinPayload(payload);
      if (!parsed) return;
      const roomId = getChatRoomId(parsed.communitySlug, parsed.channel);
      void socket.leave(roomId);
      joinedRooms.delete(roomId);
    });

    socket.on("chat:send", async (payload: unknown) => {
      const parsed = parseSendPayload(payload);
      if (!parsed) {
        socket.emit("chat:error", { message: "Invalid message payload." });
        return;
      }

      const roomId = getChatRoomId(parsed.communitySlug, parsed.channel);

      try {
        const message = await createCommunityChatMessage(
          userId,
          parsed.communitySlug,
          chatChannelToPrisma(parsed.channel),
          {
            content: parsed.content,
            attachment: parsed.attachment,
          },
        );

        io.to(roomId).emit("chat:message", message);
      } catch (error) {
        socket.emit("chat:error", {
          message:
            error instanceof Error ? error.message : "Could not send message.",
        });
      }
    });

    socket.on("disconnect", () => {
      joinedRooms.clear();
    });

    socket.on("dm:join", async (payload: unknown) => {
      const conversationId =
        payload && typeof payload === "object" && "conversationId" in payload
          ? String((payload as { conversationId: unknown }).conversationId)
          : "";
      if (!conversationId) {
        socket.emit("dm:error", { message: "Invalid conversation." });
        return;
      }

      const conversation = await import("@/lib/prisma").then((m) =>
        m.prisma.directConversation.findUnique({
          where: { id: conversationId },
          select: { participantLowId: true, participantHighId: true },
        }),
      );

      if (
        !conversation ||
        (conversation.participantLowId !== userId &&
          conversation.participantHighId !== userId)
      ) {
        socket.emit("dm:error", { message: "Conversation not found." });
        return;
      }

      const roomId = `dm:${conversationId}`;
      await socket.join(roomId);
      joinedRooms.add(roomId);
    });

    socket.on("dm:leave", (payload: unknown) => {
      const conversationId =
        payload && typeof payload === "object" && "conversationId" in payload
          ? String((payload as { conversationId: unknown }).conversationId)
          : "";
      if (!conversationId) return;
      const roomId = `dm:${conversationId}`;
      void socket.leave(roomId);
      joinedRooms.delete(roomId);
    });
  });

  return io;
}
