"use client";

import { useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase } from "@/lib/detail-route-ui";

interface ToggleSongFavoriteButtonProps {
  songSlug: string;
  initialFavorited?: boolean;
  className?: string;
}

export function ToggleSongFavoriteButton({
  songSlug,
  initialFavorited = false,
  className,
}: ToggleSongFavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  useOnValueChange(initialFavorited, (next) => setFavorited(next));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleToggle() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/song/${encodeURIComponent(songSlug)}/favorite`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not update favourites.",
        );
      }
      setFavorited(Boolean(data.favorited));
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update favourites.",
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
            "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
          ),
          className,
        )}
        aria-pressed={favorited}
      >
        <Heart className={cn("size-3.5 shrink-0", favorited && "fill-current")} />
        <span className="truncate">
          {favorited ? "Added to Favourites" : "Add To Favourites"}
        </span>
      </button>
      {error ? (
        <p className="mt-1 text-center text-[10px] text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
