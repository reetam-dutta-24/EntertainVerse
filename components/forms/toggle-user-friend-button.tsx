"use client";

import { useState } from "react";
import { UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase } from "@/lib/detail-route-ui";
import type { ViewerFriendStatus } from "@/types";
import { useToast } from "@/components/feedback/feedback-provider";

interface ToggleUserFriendButtonProps {
  handle: string;
  initialStatus?: ViewerFriendStatus;
  incomingFriendRequestId?: string;
  className?: string;
  onFriendCountChange?: (count: number) => void;
  onStatusChange?: (status: ViewerFriendStatus) => void;
}


const FRIEND_STATUS_TOASTS: Partial<Record<ViewerFriendStatus, string>> = {
  pending_outgoing: "Friend request sent",
  friends: "You're now friends",
  none: "Friend removed",
};

export function ToggleUserFriendButton({
  handle,
  initialStatus = "none",
  incomingFriendRequestId,
  className,
  onFriendCountChange,
  onStatusChange,
}: ToggleUserFriendButtonProps) {
  const [status, setStatus] = useState<ViewerFriendStatus>(initialStatus);
  const [requestId, setRequestId] = useState(incomingFriendRequestId);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [error, setError] = useState<string>();

  function applyResult(data: Record<string, unknown>) {
    if (typeof data.friendStatus === "string") {
      const next = data.friendStatus as ViewerFriendStatus;
      setStatus(next);
      onStatusChange?.(next);
      const message = FRIEND_STATUS_TOASTS[next];
      if (message) toast(message);
    } else if (typeof data.following === "boolean") {
      const next = data.following ? "friends" : "none";
      setStatus(next);
      onStatusChange?.(next);
    }

    const count =
      typeof data.friendCount === "number"
        ? data.friendCount
        : data.followerCount;
    if (typeof count === "number") {
      onFriendCountChange?.(count);
    }
  }

  async function handlePrimaryAction() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(handle)}/follow`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not update friend status.",
        );
      }
      applyResult(data as Record<string, unknown>);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update friend status.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!requestId) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/friend-requests/${encodeURIComponent(requestId)}/accept`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not accept friend request.",
        );
      }
      applyResult(data as Record<string, unknown>);
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Could not accept friend request.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    if (!requestId) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/friend-requests/${encodeURIComponent(requestId)}/reject`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not decline friend request.",
        );
      }
      setStatus("none");
      onStatusChange?.("none");
    } catch (declineError) {
      setError(
        declineError instanceof Error
          ? declineError.message
          : "Could not decline friend request.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (status === "pending_incoming") {
    return (
      <div className={cn("min-w-0 flex-1", className)}>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || !requestId}
            onClick={() => void handleAccept()}
            className={detailHeroBtnBase(
              "flex-1 border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
            )}
          >
            <UserCheck className="size-3.5 shrink-0" />
            <span className="truncate">Accept</span>
          </button>
          <button
            type="button"
            disabled={loading || !requestId}
            onClick={() => void handleDecline()}
            aria-label="Decline friend request"
            className={detailHeroBtnBase(
              "w-11 shrink-0 border-2 border-brand-magenta bg-black/70 px-0 text-white",
            )}
          >
            <X className="size-3.5 shrink-0 text-brand-magenta" />
          </button>
        </div>
        {error ? (
          <p className="mt-1 text-center text-caption text-red-400">{error}</p>
        ) : null}
      </div>
    );
  }

  const isFriend = status === "friends";
  const isPending = status === "pending_outgoing";

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handlePrimaryAction()}
        className={cn(
          detailHeroBtnBase(
            isFriend || isPending
              ? "border-2 border-brand-magenta bg-black/70 text-white"
              : "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
          ),
        )}
        aria-pressed={isFriend}
      >
        {isFriend ? (
          <UserCheck className="size-3.5 shrink-0 text-brand-magenta" />
        ) : isPending ? (
          <UserMinus className="size-3.5 shrink-0 text-brand-magenta" />
        ) : (
          <UserPlus className="size-3.5 shrink-0" />
        )}
        <span className="truncate">
          {isFriend ? "Friends" : isPending ? "Request Sent" : "Add Friend"}
        </span>
      </button>
      {error ? (
        <p className="mt-1 text-center text-caption text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
