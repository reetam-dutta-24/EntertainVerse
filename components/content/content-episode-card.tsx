"use client";

import { useState } from "react";
import { ContentWatchNowLink } from "@/components/content/content-watch-now-link";
import { useAppRouter } from "@/hooks/use-app-router";
import { Clock, Eye, Heart, PlayCircle, Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContentWatchPath } from "@/lib/content-routes";
import { formatEpisodeDisplayTitle } from "@/lib/format-episode-title";
import { formatRating } from "@/lib/format-rating";
import { getAccentTint, resolveCardTint } from "@/lib/card-theme";
import type { AccentColor, Episode } from "@/types";
import { Chip } from "@/components/ui/chip";
import { GradientButton } from "@/components/ui/gradient-button";

export interface ContentEpisodeCardProps {
  episode: Episode;
  contentId: string;
  contentAccent?: AccentColor;
  onPlay?: () => void;
}

function resolveTint(contentId: string, contentAccent?: AccentColor) {
  if (contentAccent) return getAccentTint(contentAccent);
  return resolveCardTint(contentId);
}

/** Episode card — compact default; subtle scale on hover without outer glow. */
export function ContentEpisodeCard({
  episode,
  contentId,
  contentAccent,
  onPlay,
}: ContentEpisodeCardProps) {
  const router = useAppRouter();
  const [hovered, setHovered] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const season = episode.seasonNumber ?? 1;
  const tint = resolveTint(contentId, contentAccent);
  const durationLabel = episode.duration?.replace("m", " Min") ?? "24 Min";
  const displayTitle = formatEpisodeDisplayTitle(episode.title, episode.number);
  const watchHref = getContentWatchPath(contentId, episode.id);

  async function handleWatchlistAdd() {
    if (watchlistLoading) return;
    setWatchlistLoading(true);
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentSlug: contentId,
          priority: "NORMAL",
          status: "PENDING",
        }),
      });
      if (response.ok) router.refresh();
    } finally {
      setWatchlistLoading(false);
    }
  }

  return (
    <article
      className={cn(
        "relative mx-auto w-full max-w-[351px] origin-center will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        hovered ? "z-30 scale-[1.06]" : "z-0 scale-100",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex flex-col overflow-visible rounded-2xl bg-black shadow-[inset_0_0_24px_rgba(0,0,0,0.55)] transition-shadow duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
      >
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-t-2xl transition-[height] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
            hovered ? "h-[184px]" : "h-[168px] sm:h-[178px]",
          )}
        >
          {episode.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={episode.thumbnailUrl}
              alt={displayTitle}
              className="size-full object-cover"
            />
          ) : (
            <div className={cn("size-full", tint.header)} />
          )}

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
              hovered ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <div className="flex items-end justify-between gap-2">
              <p className="line-clamp-2 text-xs font-semibold text-white sm:text-sm">
                S{season} | Episode {episode.number} · {displayTitle}
              </p>
              <span className="inline-flex shrink-0 items-center gap-1 text-caption text-white/80">
                <Clock className="size-3" />
                {durationLabel}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/95 to-transparent px-3 pb-2.5 pt-6 transition-opacity duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
              hovered ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <ContentWatchNowLink
              href={watchHref}
              contentSlug={contentId}
              onClick={onPlay}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-brand-magenta bg-black/80 px-3 py-1 text-micro font-medium text-white transition-colors hover:bg-brand-magenta/20"
            >
              <PlayCircle className="size-3.5 text-brand-magenta" />
              Watch now
            </ContentWatchNowLink>
            <div className="flex items-center gap-2">
              {episode.rating != null ? (
                <span className="inline-flex items-center gap-0.5 text-caption font-semibold text-white">
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  {formatRating(episode.rating)}
                </span>
              ) : null}
              <GradientButton
                size="sm"
                type="button"
                disabled={watchlistLoading}
                onClick={() => void handleWatchlistAdd()}
                className="h-6 rounded-full px-2.5 text-micro transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Plus className="size-3" />
                Watchlist
              </GradientButton>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-b-2xl bg-black/95 transition-[max-height,opacity,padding] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
            hovered ? "max-h-52 gap-2.5 p-4 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <p className="text-base font-bold text-white">
            S{season} | E{episode.number} · {displayTitle}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {episode.language ? (
              <Chip language={episode.language.toLowerCase()} className="h-5 text-caption">
                {episode.language}
              </Chip>
            ) : null}
            <Chip chipKey="ost" className="h-5 gap-1 text-caption">
              <Clock className="size-3" />
              {durationLabel}
            </Chip>
            {episode.views ? (
              <Chip chipKey="show" className="h-5 gap-1 text-caption">
                <Eye className="size-3" />
                {episode.views}
              </Chip>
            ) : null}
            {episode.likes ? (
              <Chip chipKey="romance" className="h-5 gap-1 text-caption">
                <Heart className="size-3" />
                {episode.likes}
              </Chip>
            ) : null}
          </div>
          {episode.description ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-white/85">
              {episode.description}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
