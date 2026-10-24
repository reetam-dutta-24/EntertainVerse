"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock, X } from "lucide-react";
import { markNotificationRead } from "@/lib/notifications-store";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import type { AppNotification } from "@/types";

export interface NotificationItemProps {
  notification: AppNotification;
  /** "panel" = compact dropdown row linking to the notifications page;
   *  "full" = expanded card with category, full text, and content CTA. */
  variant?: "panel" | "full";
  className?: string;
  onNavigate?: () => void;
}

function FriendRequestActions({
  requestId,
  onDone,
}: {
  requestId: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string>();

  async function respond(action: "accept" | "reject") {
    setLoading(action);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/friend-requests/${encodeURIComponent(requestId)}/${action}`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Could not ${action} friend request.`,
        );
      }
      onDone?.();
      router.refresh();
    } catch (respondError) {
      setError(
        respondError instanceof Error
          ? respondError.message
          : "Could not respond to friend request.",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading !== null}
          onClick={(event) => {
            event.stopPropagation();
            void respond("accept");
          }}
          className="flex items-center gap-1 rounded-full border border-brand-magenta bg-brand-magenta/15 px-3 py-1 text-micro font-semibold text-white transition-colors hover:bg-brand-magenta/25 disabled:opacity-50"
        >
          <Check className="size-3.5 text-brand-magenta" />
          Accept
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={(event) => {
            event.stopPropagation();
            void respond("reject");
          }}
          className="flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-micro font-semibold text-white/85 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <X className="size-3.5" />
          Decline
        </button>
      </div>
      {error ? <p className="text-caption text-red-400">{error}</p> : null}
    </div>
  );
}

/** Single notification — neon border and glow while unread; clicking an
 *  unread notification marks it read everywhere (bell badge included). */
export function NotificationItem({
  notification,
  variant = "panel",
  className,
  onNavigate,
}: NotificationItemProps) {
  const unread = !notification.read;
  const isFriendRequest =
    notification.actionType === "friend_request" && notification.actionRefId;

  const containerClass = cn(
    "flex w-full overflow-hidden rounded-xl bg-glass-purple text-left shadow-card-inner transition-shadow duration-300",
    unread
      ? "border border-brand-magenta/80 hover:shadow-glow-pink-soft"
      : "border border-white/10 hover:shadow-glow-pink-soft",
    className,
  );

  const title = (
    <p
      className={cn(
        "flex items-center gap-1.5 text-sm font-bold text-white",
        unread && "text-brand-pink",
      )}
    >
      {unread ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-brand-magenta"
          aria-hidden
        />
      ) : null}
      <span className="truncate">{notification.title}</span>
    </p>
  );

  const timestamp = notification.createdAt ? (
    <p className="flex items-center gap-1 text-caption text-muted/80">
      <Clock className="size-3 shrink-0" />
      {notification.createdAt}
    </p>
  ) : null;

  const thumbnail = (widthClass: string) =>
    notification.imageUrl ? (
      <div
        className={cn(
          "relative shrink-0 self-stretch overflow-hidden",
          widthClass,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={notification.imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-transparent" />
      </div>
    ) : null;

  if (variant === "panel") {
    return (
      <Link
        href="/dashboard/notifications"
        onClick={() => {
          void markNotificationRead(notification.id);
          onNavigate?.();
        }}
        className={containerClass}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-3.5">
          {title}
          {timestamp}
          {notification.description ? (
            <p className="line-clamp-2 text-xs text-white/85">
              {notification.description}
            </p>
          ) : null}
          <p
            className={cn(
              "text-caption font-semibold italic",
              unread ? "text-brand-magenta" : "text-muted/70",
            )}
          >
            {unread ? "Unread" : "Read"}
          </p>
        </div>
        {thumbnail("w-[104px]")}
      </Link>
    );
  }

  return (
    <div
      onClick={() => void markNotificationRead(notification.id)}
      className={cn(containerClass, unread && "cursor-pointer")}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {title}
          {notification.category ? (
            <Chip variant="brand" className="h-5 shrink-0 text-caption">
              {notification.category}
            </Chip>
          ) : null}
        </div>
        {timestamp}
        {notification.description ? (
          <p className="text-xs leading-relaxed text-white/85 sm:text-sm">
            {notification.description}
          </p>
        ) : null}
        {isFriendRequest && unread ? (
          <FriendRequestActions
            requestId={notification.actionRefId!}
            onDone={() => void markNotificationRead(notification.id)}
          />
        ) : null}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p
            className={cn(
              "text-caption font-semibold italic",
              unread ? "text-brand-magenta" : "text-muted/70",
            )}
          >
            {unread ? "Unread — click to mark as read" : "Read"}
          </p>
          {notification.href ? (
            <Link
              href={notification.href}
              onClick={() => void markNotificationRead(notification.id)}
              className="flex items-center gap-1 rounded-full border border-brand-magenta px-3 py-1 text-micro font-semibold text-white transition-colors hover:bg-brand-magenta/15"
            >
              View profile
              <ArrowRight className="size-3.5 text-brand-magenta" />
            </Link>
          ) : null}
        </div>
      </div>
      {thumbnail("w-[104px] sm:w-[150px]")}
    </div>
  );
}
