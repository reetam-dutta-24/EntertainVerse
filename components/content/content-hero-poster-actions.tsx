"use client";

import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isMovieContentType } from "@/lib/content-media";
import { getContentWatchPath } from "@/lib/content-routes";
import {
  detailHeroBtnBase,
  DETAIL_HERO_BTN_ACCENT_SOLID,
  DETAIL_HERO_BTN_GROUP,
  DETAIL_HERO_BTN_WATCH,
  HERO_BTN_INTERACTIVE,
} from "@/lib/detail-route-ui";
import { ToggleContentFavoriteButton } from "@/components/forms/toggle-content-favorite-button";
import { ContentHeroWatchlistButton } from "@/components/content/content-hero-watchlist-button";
import { ContentWatchNowLink } from "@/components/content/content-watch-now-link";
import type { ContentDetail, Episode, MediaType } from "@/types";

function isSongMedia(type: MediaType) {
  return type === "song" || type === "album" || type === "playlist";
}

export interface ContentHeroPosterActionsProps {
  content: ContentDetail;
  continueEpisode: Episode | null;
  initialFavorited?: boolean;
  initialOnWatchlist?: boolean;
}

export function ContentHeroPosterActions({
  content,
  continueEpisode,
  initialFavorited,
  initialOnWatchlist,
}: ContentHeroPosterActionsProps) {
  const songMedia = isSongMedia(content.type);
  const isMovie = isMovieContentType(content.type);
  const isWatching = continueEpisode != null;
  const season = continueEpisode?.seasonNumber ?? 1;
  const episodeNum = continueEpisode?.number ?? 1;

  const watchLabel = songMedia
    ? content.resumeLabel
      ? `Continue from ${content.resumeLabel}`
      : "Play now"
    : isMovie
      ? "Watch movie"
      : isWatching
        ? `Continue S${season} E${episodeNum}`
        : "Watch now";

  const watchHref = songMedia
    ? `#player`
    : getContentWatchPath(
        content.id,
        continueEpisode?.id ?? content.episodes[0]?.id,
      );

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 flex flex-col gap-2.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 pb-4 pt-10 sm:gap-3 sm:px-5 sm:pb-5",
      )}
    >
      <div className={DETAIL_HERO_BTN_GROUP}>
        <ToggleContentFavoriteButton
          contentSlug={content.id}
          initialFavorited={initialFavorited}
        />
        <ContentHeroWatchlistButton
          contentSlug={content.id}
          contentTitle={content.title}
          initialOnWatchlist={initialOnWatchlist}
        />
      </div>

      <div className={DETAIL_HERO_BTN_GROUP}>
        <ContentWatchNowLink
          href={watchHref}
          contentSlug={content.id}
          className={detailHeroBtnBase(
            cn(DETAIL_HERO_BTN_ACCENT_SOLID, DETAIL_HERO_BTN_WATCH, HERO_BTN_INTERACTIVE),
          )}
        >
          <PlayCircle className="size-4 shrink-0" />
          <span className="truncate">{watchLabel}</span>
        </ContentWatchNowLink>
      </div>
    </div>
  );
}
