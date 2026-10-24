"use client";

import { useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase } from "@/lib/detail-route-ui";

interface ToggleArtistFavoriteButtonProps {
  artistSlug: string;
  initialFavorited?: boolean;
  className?: string;
  onStatusChange?: (message: string) => void;
}

export function ToggleArtistFavoriteButton({
  artistSlug,
  initialFavorited = false,
  className,
  onStatusChange,
}: ToggleArtistFavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  useOnValueChange(initialFavorited, (next) => setFavorited(next));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleToggle() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/artist/${encodeURIComponent(artistSlug)}/favorite`,
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
      const nextFavorited = Boolean(data.favorited);
      setFavorited(nextFavorited);
      onStatusChange?.(
        nextFavorited
          ? "Added to your favourites."
          : "Removed from your favourites.",
      );
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
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleToggle()}
        title={
          favorited
            ? "Remove this artist from your favourites"
            : "Save this artist to your favourites"
        }
        className={cn(
          detailHeroBtnBase(
            favorited
              ? "border-2 border-brand-magenta bg-black/70 text-white"
              : "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
          ),
          "transition duration-200 hover:opacity-90 disabled:opacity-50",
          className,
        )}
        aria-pressed={favorited}
      >
        <Heart
          className={cn(
            "size-3.5 shrink-0",
            favorited ? "fill-brand-magenta text-brand-magenta" : "fill-current",
          )}
        />
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
