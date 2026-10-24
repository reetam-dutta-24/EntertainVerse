"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Clapperboard, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailHeroBtnBase, HERO_BTN_INTERACTIVE } from "@/lib/detail-route-ui";
import { useOptionalContentEngagement } from "@/components/content/content-engagement-context";

interface ContentHeroWatchlistButtonProps {
  contentSlug: string;
  contentTitle: string;
  initialOnWatchlist?: boolean;
  className?: string;
}

export function ContentHeroWatchlistButton({
  contentSlug,
  contentTitle,
  initialOnWatchlist = false,
  className,
}: ContentHeroWatchlistButtonProps) {
  const router = useAppRouter();
  const engagement = useOptionalContentEngagement();
  const [onWatchlist, setOnWatchlist] = useState(initialOnWatchlist);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleClick() {
    if (loading) return;

    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/content/${encodeURIComponent(contentSlug)}/watchlist`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not update watchlist.",
        );
      }
      const nextOnWatchlist = Boolean(data.onWatchlist);
      setOnWatchlist(nextOnWatchlist);
      if (engagement && typeof data.watching === "number") {
        engagement.applyWatchlist(data.watching, nextOnWatchlist);
      }
      router.refresh();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update watchlist.",
      );
    } finally {
      setLoading(false);
    }
  }

  const label = onWatchlist ? "On Watchlist" : "Add to watchlist";

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleClick()}
        title={
          onWatchlist
            ? `Remove ${contentTitle} from your watchlist`
            : `Add ${contentTitle} to your watchlist`
        }
        aria-pressed={onWatchlist}
        className={detailHeroBtnBase(
          cn(
            "w-full border-transparent bg-gradient-blue-violet hover:border-brand-magenta hover:bg-transparent hover:[background-image:none]",
            HERO_BTN_INTERACTIVE,
            onWatchlist && "ring-1 ring-brand-magenta/60",
          ),
        )}
      >
        {onWatchlist ? (
          <Clapperboard className="size-3.5 shrink-0" />
        ) : (
          <Plus className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </button>
      {error ? (
        <p className="mt-1 text-center text-caption text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
