"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { io, type Socket } from "socket.io-client";
import type { CommunityChatChannelId } from "@/lib/community-chat";
import { getSocketUrl } from "@/lib/env/socket";
import type { ChatAttachment } from "@/lib/chat-emojis";
import type { ChatMessage } from "@/types";
import { useTypers, useTypingSender } from "@/hooks/use-typing";

interface UseCommunityChatOptions {
  communitySlug: string;
  channel: CommunityChatChannelId;
  viewerUserId?: string;
  enabled: boolean;
}

function withViewerFlags(
  message: ChatMessage,
  viewerUserId?: string,
): ChatMessage {
  const isAuthor = viewerUserId != null && message.author.id === viewerUserId;
  return {
    ...message,
    own: isAuthor,
    canEdit: message.canEdit ?? isAuthor,
    canDelete: message.canDelete ?? isAuthor,
  };
}

export function useCommunityChat({
  communitySlug,
  channel,
  viewerUserId,
  enabled,
}: UseCommunityChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();
  const socketRef = useRef<Socket | null>(null);
  const { typers, applyTyping, clearTypers } = useTypers();
  const { onInput: notifyTyping, stop: stopTyping } = useTypingSender((value) =>
    socketRef.current?.emit("chat:typing", { communitySlug, channel, typing: value }),
  );

  // Reset the loading/error state whenever the chat target changes.
  useOnValueChange(`${communitySlug}|${channel}|${viewerUserId}|${enabled}`, () => {
    setLoading(true);
    setError(undefined);
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    fetch(
      `/api/communities/${encodeURIComponent(communitySlug)}/chat?channel=${encodeURIComponent(channel)}`,
      { credentials: "include" },
    )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Could not load chat history.",
          );
        }
        if (!cancelled) {
          setMessages(
            Array.isArray(data.messages)
              ? (data.messages as ChatMessage[]).map((message) =>
                  withViewerFlags(message, viewerUserId),
                )
              : [],
          );
        }
      })
      .catch((fetchError: Error) => {
        if (!cancelled) setError(fetchError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [communitySlug, channel, enabled, viewerUserId]);

  useEffect(() => {
    if (!enabled) return;

    const socket = io(getSocketUrl(), {
      path: "/api/socket/io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError(undefined);
      socket.emit("chat:join", { communitySlug, channel });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (connectError) => {
      setConnected(false);
      setError(
        connectError.message.includes("Unauthorized")
          ? "Log in to use community chat."
          : "Could not connect to chat. Start the app with npm run dev (Socket.IO server).",
      );
    });

    socket.on("chat:typing", (payload: { userId: string; name?: string; typing: boolean }) => {
      if (payload.userId === viewerUserId) return;
      applyTyping({ userId: payload.userId, name: payload.name }, payload.typing);
    });

    socket.on("chat:message", (message: ChatMessage) => {
      // Their message landed — they're done typing.
      applyTyping({ userId: message.author.id }, false);
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, withViewerFlags(message, viewerUserId)];
      });
    });

    socket.on("chat:updated", (message: ChatMessage) => {
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? withViewerFlags(message, viewerUserId)
            : item,
        ),
      );
    });

    socket.on("chat:deleted", (payload: { id?: string }) => {
      if (!payload?.id) return;
      setMessages((current) =>
        current.filter((item) => item.id !== payload.id),
      );
    });

    socket.on("chat:error", (payload: { message?: string }) => {
      if (payload?.message) setError(payload.message);
    });

    return () => {
      socket.emit("chat:leave", { communitySlug, channel });
      socket.disconnect();
      socketRef.current = null;
      clearTypers();
    };
  }, [communitySlug, channel, enabled, viewerUserId, applyTyping, clearTypers]);

  const sendMessage = useCallback(
    (payload: { content: string; attachment?: ChatAttachment }) => {
      const trimmed = payload.content.trim();
      if ((!trimmed && !payload.attachment) || !socketRef.current?.connected) {
        return;
      }

      socketRef.current.emit("chat:send", {
        communitySlug,
        channel,
        content: trimmed,
        attachment: payload.attachment,
      });
      stopTyping();
    },
    [communitySlug, channel, stopTyping],
  );

  const updateMessage = useCallback(
    async (messageId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return false;

      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/chat/${encodeURIComponent(messageId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: trimmed }),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not update message.",
        );
        return false;
      }

      if (data.message) {
        setMessages((current) =>
          current.map((item) =>
            item.id === messageId
              ? withViewerFlags(data.message as ChatMessage, viewerUserId)
              : item,
          ),
        );
      }

      return true;
    },
    [communitySlug, viewerUserId],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const response = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/chat/${encodeURIComponent(messageId)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not delete message.",
        );
        return false;
      }

      setMessages((current) =>
        current.filter((item) => item.id !== messageId),
      );
      return true;
    },
    [communitySlug],
  );

  return {
    messages,
    loading: enabled && loading,
    connected: enabled && connected,
    error,
    sendMessage,
    updateMessage,
    deleteMessage,
    /** Others typing in this channel right now. */
    typers,
    /** Call on each keystroke in the composer. */
    notifyTyping,
  };
}
