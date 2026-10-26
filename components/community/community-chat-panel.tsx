"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import type { CommunityChatChannelId } from "@/lib/community-chat";
import { getCommunityChatTheme } from "@/lib/community-chat-theme";
import { useCommunityChat } from "@/hooks/use-community-chat";
import { ChatMessageRow } from "@/components/community/chat-message-row";
import { ChatInput } from "@/components/community/chat-input";
import { typingLabel } from "@/hooks/use-typing";
import type { AccentColor } from "@/lib/catalog-enums";

interface CommunityChatPanelProps {
  communitySlug: string;
  channel: CommunityChatChannelId;
  viewerUserId?: string;
  isMember: boolean;
  accent?: AccentColor;
  placeholder?: string;
  className?: string;
}

function ScrollBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function EmptyState({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: ReturnType<typeof getCommunityChatTheme>;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-3 text-center text-sm font-medium"
      style={{ ...theme.emptyState, color: theme.mutedText }}
    >
      {children}
    </div>
  );
}

export function CommunityChatPanel({
  communitySlug,
  channel,
  viewerUserId,
  isMember,
  accent,
  placeholder = "Send a message…",
  className,
}: CommunityChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const enabled = Boolean(viewerUserId && isMember);
  const theme = useMemo(() => getCommunityChatTheme(accent), [accent]);

  const { messages, loading, connected, error, sendMessage, updateMessage, deleteMessage, typers, notifyTyping } =
    useCommunityChat({
    communitySlug,
    channel,
    viewerUserId,
    enabled,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!viewerUserId) {
    return (
      <div className={cn("flex flex-1 items-center justify-center px-6", className)}>
        <EmptyState theme={theme}>Log in to join the conversation.</EmptyState>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className={cn("flex flex-1 items-center justify-center px-6", className)}>
        <EmptyState theme={theme}>
          Join this community to send messages in chat.
        </EmptyState>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
      style={theme.panelAmbient}
    >
      <ScrollBody className="relative z-10 flex flex-col gap-4 pb-2">
        {loading ? (
          <EmptyState theme={theme}>Loading messages…</EmptyState>
        ) : messages.length === 0 ? (
          <EmptyState theme={theme}>
            No messages yet. Say hello to the community.
          </EmptyState>
        ) : (
          messages.map((message) => (
            <ChatMessageRow
              key={message.id}
              message={message}
              theme={theme}
              onUpdate={updateMessage}
              onDelete={deleteMessage}
            />
          ))
        )}
        <div ref={bottomRef} />
      </ScrollBody>

      <div className="relative z-10 shrink-0 px-4 py-3 sm:px-5" style={theme.footer}>
        {!connected && !error ? (
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: theme.mutedText }}
          >
            Connecting to chat…
          </p>
        ) : null}
        {error ? (
          <p className="mb-2 text-xs font-medium text-red-300">{error}</p>
        ) : null}
        <p className="mb-1.5 h-4 text-xs font-medium italic" style={{ color: theme.mutedText }} aria-live="polite">
          {typingLabel(typers)}
        </p>
        <ChatInput
          placeholder={placeholder}
          disabled={!connected}
          onSend={sendMessage}
          onTyping={notifyTyping}
          theme={theme}
        />
      </div>
    </div>
  );
}
