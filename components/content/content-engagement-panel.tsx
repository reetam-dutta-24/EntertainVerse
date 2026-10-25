"use client";

import { useState } from "react";
import { Heart, Eye, FolderOpen, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccentTint, getTintRgb } from "@/lib/card-theme";
import { glassEdgeClass, glassSurface } from "@/components/cards/glass-card-frame";
import type { AccentColor, ContentEngagementStat } from "@/types";
import { useContentEngagement, parseEngagementStatValue } from "@/components/content/content-engagement-context";

const STAT_ICONS: Record<string, LucideIcon> = {
  likes: Heart,
  watching: Users,
  views: Eye,
  collections: FolderOpen,
};

interface ContentEngagementPanelProps {
  accent?: AccentColor;
}

export function ContentEngagementPanel({ accent }: ContentEngagementPanelProps) {
  const {
    favoriteApiPath,
    stats,
    favorited,
    applyFavorite,
  } = useContentEngagement();
  const statBackground = glassSurface(getTintRgb(getAccentTint(accent).glass).join(","));
  const [likeLoading, setLikeLoading] = useState(false);

  async function handleLikeToggle() {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const response = await fetch(favoriteApiPath, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not update like.",
        );
      }
      const nextFavorited = Boolean(data.favorited);
      const currentLikes = parseEngagementStatValue(stats, "likes");
      applyFavorite(
        typeof data.favoriteCount === "number"
          ? data.favoriteCount
          : nextFavorited
            ? currentLikes + 1
            : Math.max(0, currentLikes - 1),
        nextFavorited,
      );
    } catch {
      // ignore — favourite button shows errors separately
    } finally {
      setLikeLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {stats.map((stat) => (
          <EngagementStatTile
            key={stat.id}
            stat={stat}
            statBackground={statBackground}
            isLikeTile={stat.id === "likes"}
            liked={favorited}
            likeLoading={likeLoading}
            onLikeToggle={() => void handleLikeToggle()}
          />
        ))}
      </div>
    </div>
  );
}

function EngagementStatTile({
  stat,
  statBackground,
  isLikeTile,
  liked,
  likeLoading,
  onLikeToggle,
}: {
  stat: ContentEngagementStat;
  statBackground: string;
  isLikeTile?: boolean;
  liked?: boolean;
  likeLoading?: boolean;
  onLikeToggle?: () => void;
}) {
  const Icon = STAT_ICONS[stat.id] ?? Heart;

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl px-2 py-3 text-center backdrop-blur-xl shadow-[0_10px_28px_-16px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.07)]"
      style={{ background: statBackground }}
    >
      <div aria-hidden className={glassEdgeClass} />
      {isLikeTile ? (
        <button
          type="button"
          disabled={likeLoading}
          onClick={onLikeToggle}
          aria-pressed={liked}
          title={liked ? "Unlike" : "Like this title"}
          className={cn(
            "absolute right-2 top-2 z-30 cursor-pointer rounded-full p-1 transition-all duration-300",
            "hover:bg-white/15 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50",
            liked ? "text-brand-pink" : "text-white/70",
          )}
        >
          <Heart className={cn("size-3.5", liked && "fill-current")} />
        </button>
      ) : null}
      <Icon className="size-4 text-white/80" strokeWidth={2} />
      <span className="text-xl font-extrabold leading-tight text-white sm:text-2xl">{stat.value}</span>
      <span className="text-[11px] font-medium leading-tight text-white/60 sm:uppercase sm:tracking-wider">
        {stat.label}
      </span>
    </div>
  );
}
