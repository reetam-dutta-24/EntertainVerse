"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { getSocketUrl } from "@/lib/env/socket";
import { Pencil, Trash2, MessagesSquare } from "lucide-react";
import { DmUserAvatar } from "@/components/messages/dm-user-avatar";
import { refreshMessagesUnread } from "@/lib/messages-store";
import { EmptyState } from "@/components/ui/empty-state";

interface DmPeer {
  id: string;
  name: string;
  handle: string;
  avatarColor: string;
  avatarUrl?: string;
}

interface DmConversation {
  id: string;
  peer: DmPeer;
  unreadCount?: number;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    warnNonFriend?: boolean;
    createdAt: string;
  };
}

interface DmMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  warnNonFriend?: boolean;
  editedAt?: string;
  createdAt: string;
  isOwn?: boolean;
  sender?: DmPeer;
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-magenta px-1.5 text-micro font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function DashboardMessagesPanel() {
  const searchParams = useSearchParams();
  const targetHandle = searchParams.get("user")?.trim() ?? "";

  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [editDraft, setEditDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((entry) => entry.id === activeId),
    [conversations, activeId],
  );

  const totalUnreadChats = useMemo(
    () => conversations.filter((entry) => (entry.unreadCount ?? 0) > 0).length,
    [conversations],
  );

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/dm/conversations", {
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && Array.isArray(data.conversations)) {
      setConversations(data.conversations as DmConversation[]);
    }
    void refreshMessagesUnread();
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(
      `/api/dm/conversations/${encodeURIComponent(conversationId)}/messages`,
      { credentials: "include" },
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok && Array.isArray(data.messages)) {
      setMessages(data.messages as DmMessage[]);
      setConversations((current) =>
        current.map((entry) =>
          entry.id === conversationId ? { ...entry, unreadCount: 0 } : entry,
        ),
      );
      void refreshMessagesUnread();
    }
  }, []);

  useEffect(() => {
    // loadConversations only sets state after awaiting the network.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversations().finally(() => setLoading(false));
  }, [loadConversations]);

  // Open the conversation named in ?user= once it shows up in the list.
  const targetConversationId = targetHandle
    ? conversations.find((entry) => entry.peer.handle === targetHandle)?.id
    : undefined;
  useOnValueChange(targetConversationId, (id) => {
    if (id) setActiveId(id);
  });

  useEffect(() => {
    if (!activeId) return;
    // loadMessages only sets state after awaiting the network.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMessages(activeId);

    const socket = io(getSocketUrl(), {
      path: "/api/socket/io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("dm:join", { conversationId: activeId });
    });

    socket.on("dm:message", (message: DmMessage) => {
      if (message.conversationId !== activeId) {
        void loadConversations();
        return;
      }
      setMessages((current) => [...current, message]);
      void loadConversations();
    });

    socket.on("dm:edited", (message: DmMessage) => {
      setMessages((current) =>
        current.map((entry) =>
          entry.id === message.id ? { ...entry, ...message } : entry,
        ),
      );
    });

    socket.on("dm:deleted", (payload: { id: string }) => {
      setMessages((current) => current.filter((entry) => entry.id !== payload.id));
    });

    return () => {
      socket.emit("dm:leave", { conversationId: activeId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeId, loadMessages, loadConversations]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;

    setSending(true);
    setSendError(undefined);
    try {
      if (activeConversation) {
        const response = await fetch("/api/dm/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            recipientHandle: activeConversation.peer.handle,
            content: draft.trim(),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setDraft("");
          if (data.conversationId && !activeId) {
            setActiveId(data.conversationId);
          }
          if (data.message) {
            setMessages((current) => {
              const next = data.message as DmMessage;
              if (current.some((entry) => entry.id === next.id)) return current;
              return [...current, next];
            });
          } else {
            const conversationId = data.conversationId ?? activeId;
            if (conversationId) await loadMessages(conversationId);
          }
          await loadConversations();
        } else {
          setSendError(
            typeof data.error === "string"
              ? data.error
              : "Could not send message.",
          );
        }
      } else if (targetHandle) {
        const response = await fetch("/api/dm/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            recipientHandle: targetHandle,
            content: draft.trim(),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setDraft("");
          if (data.conversationId) setActiveId(data.conversationId);
          if (data.message) {
            setMessages((current) => {
              const next = data.message as DmMessage;
              if (current.some((entry) => entry.id === next.id)) return current;
              return [...current, next];
            });
          } else if (data.conversationId) {
            await loadMessages(data.conversationId);
          }
          await loadConversations();
        } else {
          setSendError(
            typeof data.error === "string"
              ? data.error
              : "Could not send message.",
          );
        }
      }
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    await fetch(`/api/dm/messages/${encodeURIComponent(messageId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    setMessages((current) => current.filter((entry) => entry.id !== messageId));
  }

  async function handleSaveEdit(messageId: string) {
    if (!editDraft.trim()) return;
    const response = await fetch(`/api/dm/messages/${encodeURIComponent(messageId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: editDraft.trim() }),
    });
    if (response.ok) {
      const data = await response.json();
      setMessages((current) =>
        current.map((entry) =>
          entry.id === messageId ? { ...entry, ...data.message } : entry,
        ),
      );
      setEditingId(undefined);
      setEditDraft("");
    }
  }

  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-3 flex items-center justify-between px-2">
          <h2 className="text-sm font-semibold text-white">Conversations</h2>
          {totalUnreadChats > 0 ? (
            <span className="rounded-full bg-brand-magenta/20 px-2 py-0.5 text-micro font-semibold text-brand-pink">
              {totalUnreadChats} unread
            </span>
          ) : null}
        </div>
        {loading ? (
          <p className="px-2 text-xs text-white/60">Loading…</p>
        ) : conversations.length === 0 ? (
          <EmptyState compact icon={<MessagesSquare />} description="No conversations yet. Search a username to start one." />
        ) : (
          <ul className="flex flex-col gap-1">
            {conversations.map((entry) => {
              const unread = entry.unreadCount ?? 0;
              const isActive = activeId === entry.id;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(entry.id)}
                    aria-current={entry.id === activeId ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                      isActive ? "bg-white/15" : "hover:bg-white/8"
                    } ${unread > 0 && !isActive ? "border border-brand-magenta/30" : ""}`}
                  >
                    <DmUserAvatar
                      name={entry.peer.name}
                      avatarColor={entry.peer.avatarColor}
                      avatarUrl={entry.peer.avatarUrl}
                      size="sm"
                      profileHandle={entry.peer.handle}
                      nestedLink
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate text-sm font-medium ${
                            unread > 0 ? "text-white" : "text-white/90"
                          }`}
                        >
                          {entry.peer.name}
                        </p>
                        <UnreadBadge count={unread} />
                      </div>
                      <p className="truncate text-caption text-white/55">
                        @{entry.peer.handle}
                      </p>
                      {entry.lastMessage ? (
                        <p className="mt-0.5 truncate text-caption text-white/45">
                          {entry.lastMessage.content}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="flex min-h-[60vh] flex-col rounded-2xl border border-white/10 bg-white/5">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          {activeConversation ? (
            <DmUserAvatar
              name={activeConversation.peer.name}
              avatarColor={activeConversation.peer.avatarColor}
              avatarUrl={activeConversation.peer.avatarUrl}
              size="sm"
              profileHandle={activeConversation.peer.handle}
            />
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">
              {activeConversation?.peer.name ??
                (targetHandle ? `@${targetHandle}` : "Select a conversation")}
            </h2>
            {activeConversation ? (
              <p className="truncate text-caption text-white/55">
                @{activeConversation.peer.handle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${
                message.isOwn ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {!message.isOwn && message.sender ? (
                <DmUserAvatar
                  name={message.sender.name}
                  avatarColor={message.sender.avatarColor}
                  avatarUrl={message.sender.avatarUrl}
                  size="sm"
                  className="mt-1"
                  profileHandle={message.sender.handle}
                />
              ) : null}
              <div
                className={`flex max-w-[80%] flex-col gap-1 ${
                  message.isOwn ? "items-end" : "items-start"
                }`}
              >
                {message.warnNonFriend && !message.isOwn ? (
                  <p className="rounded-full bg-amber-500/20 px-3 py-1 text-micro font-medium text-amber-200">
                    This person is not your friend
                  </p>
                ) : null}
                {editingId === message.id ? (
                  <div className="flex w-full max-w-md flex-col gap-2">
                    <textarea
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      className="min-h-[72px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(message.id)}
                        className="rounded-lg bg-brand-pink/80 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(undefined)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      message.isOwn
                        ? "bg-brand-pink/25 text-white"
                        : "bg-black/40 text-white/90"
                    }`}
                  >
                    {message.content}
                    {message.editedAt ? (
                      <span className="mt-1 block text-caption text-white/45">
                        edited
                      </span>
                    ) : null}
                  </div>
                )}
                {message.isOwn && editingId !== message.id ? (
                  <div className="flex gap-2 text-white/50">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(message.id);
                        setEditDraft(message.content);
                      }}
                      aria-label="Edit message"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(message.id)}
                      aria-label="Delete message"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={(event) => void handleSend(event)}
          className="border-t border-white/10 p-4"
        >
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                activeConversation || targetHandle
                  ? "Write a message…"
                  : "Select or start a conversation"
              }
              disabled={!activeConversation && !targetHandle}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
            />
            <button
              type="submit"
              disabled={sending || (!activeConversation && !targetHandle)}
              className="rounded-xl bg-brand-pink/80 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
          {sendError ? (
            <p className="mt-2 text-xs text-red-400">{sendError}</p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
