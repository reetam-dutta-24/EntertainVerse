"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CommunityGridSection,
  WelcomeBanner,
} from "@/components/dashboard";
import { CreateCommunityButton } from "@/components/forms/create-community-button";
import { JoinCommunityButton } from "@/components/forms/join-community-button";
import {
  applyCommunityListFilters,
  COMMUNITY_SORT_OPTIONS,
  type CommunitySortOption,
} from "@/lib/community-list-utils";
import type { CommunityStats } from "@/lib/data/community";
import type { Community } from "@/types";

interface CommunityDashboardProps {
  userName: string;
  stats: CommunityStats;
  genres: readonly string[];
  favourites: Community[];
  mostActive: Community[];
  recommended: Community[];
  global: Community[];
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 cursor-pointer rounded-full px-4 text-xs font-semibold text-white transition-colors",
        active
          ? "bg-brand-magenta-deep shadow-glow-pink-soft"
          : "border border-brand-magenta/70 bg-transparent hover:bg-brand-magenta/15",
      )}
    >
      {label}
    </button>
  );
}

const statTiles = (stats: CommunityStats) => [
  { emoji: "👥", label: "Communities Joined", value: String(stats.joined) },
  { emoji: "🌐", label: "Total Members", value: stats.totalMembers },
  {
    emoji: "💬",
    label: "Posts Viewed Till Now",
    value: stats.postsViewed.toLocaleString(),
  },
  {
    emoji: "⭐",
    label: "Avg AI Compatibility",
    value: `${stats.avgCompatibility}%`,
  },
];

export function CommunityDashboard({
  userName,
  stats,
  genres,
  favourites,
  mostActive,
  recommended,
  global,
}: CommunityDashboardProps) {
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeSort, setActiveSort] =
    useState<CommunitySortOption>("Recently Updated");

  const filteredFavourites = useMemo(
    () => applyCommunityListFilters(favourites, activeGenre, activeSort),
    [favourites, activeGenre, activeSort],
  );
  const filteredMostActive = useMemo(
    () => applyCommunityListFilters(mostActive, activeGenre, activeSort),
    [mostActive, activeGenre, activeSort],
  );
  const filteredRecommended = useMemo(
    () => applyCommunityListFilters(recommended, activeGenre, activeSort),
    [recommended, activeGenre, activeSort],
  );
  const filteredGlobal = useMemo(
    () => applyCommunityListFilters(global, activeGenre, activeSort),
    [global, activeGenre, activeSort],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={userName} variant="community" />

      <section className="rounded-2xl bg-surface/40 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <h2 className="text-lg font-bold text-white sm:text-xl">👥 Community Hub</h2>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto">
            <CreateCommunityButton />
            <JoinCommunityButton />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {statTiles(stats).map((tile) => (
            <div
              key={tile.label}
              className="bg-gradient-brand flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-center shadow-[0_2px_10px_rgba(255,0,204,0.12)] sm:px-4 sm:py-4"
            >
              <span className="text-caption font-semibold text-white sm:text-xs">
                {tile.emoji} {tile.label}
              </span>
              <span className="text-xl font-bold text-white sm:text-2xl">{tile.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl bg-surface/40 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
          <span className="text-sm font-bold text-white">Select genre</span>
          <div className="flex flex-wrap items-center gap-4">
            {genres.map((genre) => (
              <FilterChip
                key={genre}
                label={genre}
                active={activeGenre === genre}
                onClick={() => setActiveGenre(genre)}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
          <span className="text-sm font-bold text-white">Sort By</span>
          <div className="flex flex-wrap items-center gap-4">
            {COMMUNITY_SORT_OPTIONS.map((sort) => (
              <FilterChip
                key={sort}
                label={sort}
                active={sort === activeSort}
                onClick={() => setActiveSort(sort)}
              />
            ))}
          </div>
        </div>
      </section>

      <CommunityGridSection
        title={`⭐ Your Favourite Communities  (${filteredFavourites.length})`}
        searchPlaceholder="Search Communities……. "
        communities={filteredFavourites}
        ctaMode="view"
      />

      <CommunityGridSection
        title={`🔥 Most Active Communities  (${filteredMostActive.length})`}
        searchPlaceholder="Search Communities……. "
        communities={filteredMostActive}
        ctaMode="view"
      />

      <CommunityGridSection
        title={`🧁 Recommended For You  (${filteredRecommended.length})`}
        searchPlaceholder="Search Communities……. "
        communities={filteredRecommended}
        ctaMode="view"
      />

      <CommunityGridSection
        title={`🌍 Discover Global Communities  (${filteredGlobal.length})`}
        searchPlaceholder="Search Communities……. "
        communities={filteredGlobal}
        ctaMode="join"
      />
    </div>
  );
}
