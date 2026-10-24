"use client";

import { useAppRouter } from "@/hooks/use-app-router";
import { useState } from "react";
import { PlayCircle, Plus } from "lucide-react";
import type { AccentColor, ContentDetail, Episode } from "@/types";
import { getContentWatchPath } from "@/lib/content-routes";
import { getAccentTint, getTintOuterGlow } from "@/lib/card-theme";
import { ContentPageSection } from "@/components/content/content-page-section";
import { ContentWatchNowLink } from "@/components/content/content-watch-now-link";
import { GradientButton } from "@/components/ui/gradient-button";
import { DetailImage } from "@/components/ui/detail-image";

interface ContentMovieSectionProps {
  content: ContentDetail;
  episode?: Episode;
  contentAccent?: AccentColor;
}

/** Single full-movie watch card — replaces episode carousel for films. */
export function ContentMovieSection({
  content,
  episode,
  contentAccent,
}: ContentMovieSectionProps) {
  const router = useAppRouter();
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const tint = getAccentTint(contentAccent ?? content.accent);
  const duration =
    episode?.duration?.replace("m", " Min") ??
    content.metadata.episodeDuration ??
    "Full Movie";
  const watchHref = getContentWatchPath(content.id, episode?.id);

  async function handleWatchlistAdd() {
    if (watchlistLoading) return;
    setWatchlistLoading(true);
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentSlug: content.id,
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
    <ContentPageSection
      title="🎬 Watch this movie"
      variant="episode"
      overflowVisible
      itemsCenter
      slides={[
        {
          id: episode?.id ?? `${content.id}-movie`,
          node: (
            <article className="relative mx-auto w-full max-w-[420px]">
              <div
                className="flex flex-col overflow-hidden rounded-2xl bg-black"
                style={{ boxShadow: getTintOuterGlow(tint.glass, 14) }}
              >
                <div className="relative h-[240px] w-full overflow-hidden sm:h-[280px]">
                  <DetailImage
                    src={episode?.thumbnailUrl ?? content.backdropUrl ?? content.imageUrl}
                    alt={content.title}
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 pb-4">
                    <ContentWatchNowLink
                      href={watchHref}
                      contentSlug={content.id}
                      className="flex cursor-pointer items-center gap-2 rounded-full border border-brand-magenta bg-black/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-magenta/20"
                    >
                      <PlayCircle className="size-5 text-brand-magenta" />
                      Watch now
                    </ContentWatchNowLink>
                    <GradientButton
                      size="sm"
                      type="button"
                      disabled={watchlistLoading}
                      onClick={() => void handleWatchlistAdd()}
                      className="h-8 rounded-full px-3 text-xs transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <Plus className="size-3.5" />
                      Watchlist
                    </GradientButton>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <p className="text-lg font-bold text-white">{content.title}</p>
                  <p className="text-sm text-white/70">{duration}</p>
                  {episode?.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-white/85">
                      {episode.description}
                    </p>
                  ) : (
                    <p className="line-clamp-3 text-sm leading-relaxed text-white/85">
                      {content.synopsis}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ),
        },
      ]}
    />
  );
}
