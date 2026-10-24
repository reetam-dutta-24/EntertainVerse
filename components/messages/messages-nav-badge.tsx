"use client";

import { useMessagesUnread } from "@/components/messages/use-messages-unread";

export function MessagesNavBadge({ className }: { className?: string }) {
  const { unreadChatCount } = useMessagesUnread();
  if (unreadChatCount <= 0) return null;

  return (
    <span
      className={
        className ??
        "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-magenta px-1 text-micro font-bold leading-none text-white"
      }
    >
      {unreadChatCount > 99 ? "99+" : unreadChatCount}
    </span>
  );
}
