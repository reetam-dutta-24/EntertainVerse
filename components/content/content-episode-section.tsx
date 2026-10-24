"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Tv } from "lucide-react";
import type { AccentColor, ContentSeason, Episode } from "@/types";
import { ContentEpisodeCard } from "@/components/content/content-episode-card";
import { ContentPageSection } from "@/components/content/content-page-section";
import { EmptyState } from "@/components/ui/empty-state";

export interface ContentEpisodeSectionProps {
  episodes: Episode[];
  seasons: ContentSeason[];
  contentId: string;
  contentAccent?: AccentColor;
}

function deriveSeasonsFromEpisodes(episodes: Episode[]): ContentSeason[] {
  const seasonNumbers = [
    ...new Set(episodes.map((ep) => ep.seasonNumber ?? 1)),
  ].sort((a, b) => a - b);

  return seasonNumbers.map((seasonNumber) => ({
    id: `season-${seasonNumber}`,
    label: `Season ${seasonNumber}`,
    episodeCount: episodes.filter(
      (ep) => (ep.seasonNumber ?? 1) === seasonNumber,
    ).length,
    seasonNumber,
  }));
}

/** Watch All Episodes — season filter + paginated carousel. */
export function ContentEpisodeSection({
  episodes,
  seasons,
  contentId,
  contentAccent,
}: ContentEpisodeSectionProps) {
  const effectiveSeasons = useMemo(
    () => (seasons.length > 0 ? seasons : deriveSeasonsFromEpisodes(episodes)),
    [seasons, episodes],
  );

  const [selectedSeasonId, setSeasonId] = useState(
    () => effectiveSeasons[0]?.id ?? "season-1",
  );
  const seasonId = effectiveSeasons.some((season) => season.id === selectedSeasonId)
    ? selectedSeasonId
    : (effectiveSeasons[0]?.id ?? selectedSeasonId);

  const filtered = useMemo(() => {
    const selectedSeason = effectiveSeasons.find(
      (season) => season.id === seasonId,
    );
    const seasonNum = selectedSeason?.seasonNumber ?? 1;
    return episodes.filter((ep) => (ep.seasonNumber ?? 1) === seasonNum);
  }, [episodes, seasonId, effectiveSeasons]);

  const seasonAction =
    effectiveSeasons.length > 0 ? (
      <label className="relative inline-flex items-center">
        <select
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          aria-label="Select season"
          className="cursor-pointer appearance-none rounded-full bg-brand-purple py-2 pe-9 ps-4 text-sm font-semibold text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink focus:ring-2 focus:ring-brand-magenta"
        >
          {effectiveSeasons.map((season) => (
            <option key={season.id} value={season.id} className="bg-surface">
              {season.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 size-4 text-white" />
      </label>
    ) : null;

  const slides = filtered.map((episode) => ({
    id: episode.id,
    node: (
      <ContentEpisodeCard
        episode={episode}
        contentId={contentId}
        contentAccent={contentAccent}
      />
    ),
  }));

  if (slides.length === 0) {
    return (
      <section className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white sm:text-heading">
            📺 Watch All Episodes
          </h2>
          {seasonAction}
        </div>
        <EmptyState compact icon={<Tv />} description="No episodes available for this season yet." />
      </section>
    );
  }

  return (
    <ContentPageSection
      title="📺 Watch All Episodes"
      action={seasonAction}
      slides={slides}
      variant="episode"
      overflowVisible
      itemsCenter
      compact
    />
  );
}
