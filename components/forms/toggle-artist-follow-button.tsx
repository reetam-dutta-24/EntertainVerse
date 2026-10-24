"use client";

import { useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase } from "@/lib/detail-route-ui";

interface ToggleArtistFollowButtonProps {
  artistSlug: string;
  artistName: string;
  initialFollowing?: boolean;
  className?: string;
  onStatusChange?: (message: string, followerCount?: number) => void;
}

export function ToggleArtistFollowButton({
  artistSlug,
  artistName,
  initialFollowing = false,
  className,
  onStatusChange,
}: ToggleArtistFollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  useOnValueChange(initialFollowing, (next) => setFollowing(next));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleToggle() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/artist/${encodeURIComponent(artistSlug)}/follow`,
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
      const nextFollowing = Boolean(data.following);
      setFollowing(nextFollowing);
      onStatusChange?.(
        nextFollowing
          ? `You are now following ${artistName}.`
          : `You unfollowed ${artistName}.`,
        typeof data.followerCount === "number" ? data.followerCount : undefined,
      );
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
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleToggle()}
        title={
          following
            ? `Unfollow ${artistName}`
            : `Follow ${artistName} for updates and recommendations`
        }
        className={cn(
          detailHeroBtnBase(
            following
              ? "border-2 border-brand-magenta bg-black/70 text-white"
              : "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
          ),
          "transition duration-200 hover:opacity-90 disabled:opacity-50",
          className,
        )}
        aria-pressed={following}
      >
        <span aria-hidden className="text-sm leading-none">
          🤝
        </span>
        <span className="truncate">
          {following ? `Following ${artistName}` : `Follow ${artistName}`}
        </span>
      </button>
      {error ? (
        <p className="mt-1 text-center text-caption text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
