"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase, DETAIL_HERO_BTN_COMPACT } from "@/lib/detail-route-ui";
import { emitCollectionFavoriteCount } from "@/components/collection/collection-favorite-count-chip";
import { useToast } from "@/components/feedback/feedback-provider";

interface ToggleCollectionFavoriteButtonProps {
  collectionSlug: string;
  initialFavorited?: boolean;
  className?: string;
}

export function ToggleCollectionFavoriteButton({
  collectionSlug,
  initialFavorited = false,
  className,
}: ToggleCollectionFavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [error, setError] = useState<string>();

  async function handleToggle() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/collections/${encodeURIComponent(collectionSlug)}/favorite`,
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
      toast(data.favorited ? "Added to favourites" : "Removed from favourites");
      if (typeof data.favoriteCount === "number") {
        emitCollectionFavoriteCount(data.favoriteCount);
      }
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update favourites.",
      );
      toast(toggleError instanceof Error ? toggleError.message : "Could not update favourites.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleToggle()}
        className={cn(
          detailHeroBtnBase(
            cn(
              DETAIL_HERO_BTN_COMPACT,
              "border-transparent bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white",
            ),
          ),
        )}
        aria-pressed={favorited}
      >
        <Heart
          className={cn(
            "size-3.5 shrink-0",
            favorited ? "fill-current" : "fill-current",
          )}
        />
        <span className="truncate">
          {favorited ? "Added to Favt" : "Add to Favt"}
        </span>
      </button>
      {error ? (
        <p className="mt-1 text-center text-caption text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
