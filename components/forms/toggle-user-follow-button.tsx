"use client";

import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase } from "@/lib/detail-route-ui";

interface ToggleUserFollowButtonProps {
  handle: string;
  initialFollowing?: boolean;
  className?: string;
  onFollowerCountChange?: (count: number) => void;
}

export function ToggleUserFollowButton({
  handle,
  initialFollowing = false,
  className,
  onFollowerCountChange,
}: ToggleUserFollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleToggle() {
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
            : "Could not update follow status.",
        );
      }
      setFollowing(Boolean(data.following));
      if (typeof data.followerCount === "number") {
        onFollowerCountChange?.(data.followerCount);
      }
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update follow status.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleToggle()}
        className={cn(
          detailHeroBtnBase(
            following
              ? "border-2 border-brand-magenta bg-black/70 text-white"
              : "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
          ),
          className,
        )}
        aria-pressed={following}
      >
        {following ? (
          <UserCheck className="size-3.5 shrink-0 text-brand-magenta" />
        ) : (
          <UserPlus className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{following ? "Following" : "Follow"}</span>
      </button>
      {error ? (
        <p className="mt-1 text-center text-caption text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
