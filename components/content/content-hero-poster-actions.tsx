"use client";

import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isMovieContentType } from "@/lib/content-media";
import { getContentWatchPath } from "@/lib/content-routes";
import { ToggleContentFavoriteButton } from "@/components/forms/toggle-content-favorite-button";
import { ContentHeroWatchlistButton } from "@/components/content/content-hero-watchlist-button";
import { ContentWatchNowLink } from "@/components/content/content-watch-now-link";
import type { ContentDetail, Episode } from "@/types";

export interface ContentHeroPosterActionsProps {
  content: ContentDetail;
  continueEpisode: Episode | null;
  initialFavorited?: boolean;
  initialOnWatchlist?: boolean;
}

/** Large primary Watch CTA. */
const WATCH_PRIMARY = cn(
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 text-sm font-bold text-white",
  "shadow-[0_10px_30px_-8px_rgba(216,2,220,0.75)] transition-all duration-300 ease-out",
  "hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-8px_rgba(216,2,220,0.9)] hover:brightness-110",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink",
);

/** Hero action row for titles: Watch / Continue first, then favourite and watchlist. */
export function ContentHeroPosterActions({
  content,
  continueEpisode,
  initialFavorited,
  initialOnWatchlist,
}: ContentHeroPosterActionsProps) {
  const isMovie = isMovieContentType(content.type);
  const season = continueEpisode?.seasonNumber ?? 1;
  const episodeNum = continueEpisode?.number ?? 1;

  const watchLabel = isMovie
    ? "Watch movie"
    : continueEpisode
      ? `Continue S${season} E${episodeNum}`
      : "Watch now";

  const watchHref = getContentWatchPath(content.id, continueEpisode?.id ?? content.episodes[0]?.id);

  return (
    <>
      <ContentWatchNowLink href={watchHref} contentSlug={content.id} className={WATCH_PRIMARY}>
        <PlayCircle className="size-5 shrink-0" />
        <span className="truncate">{watchLabel}</span>
      </ContentWatchNowLink>
      <div className="flex-none">
        <ToggleContentFavoriteButton contentSlug={content.id} initialFavorited={initialFavorited} />
      </div>
      <div className="flex-none">
        <ContentHeroWatchlistButton contentSlug={content.id} contentTitle={content.title} initialOnWatchlist={initialOnWatchlist} />
      </div>
    </>
  );
}
