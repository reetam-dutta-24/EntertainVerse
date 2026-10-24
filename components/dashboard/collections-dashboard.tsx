"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { WelcomeBanner } from "@/components/dashboard";
import { CollectionGridSection } from "@/components/dashboard/collection-grid-section";
import { CreateCollectionButton } from "@/components/forms/create-collection-button";
import {
  applyCollectionListFilters,
  COLLECTION_SORT_OPTIONS,
  type CollectionSortOption,
} from "@/lib/collection-list-utils";
import type { Collection } from "@/types";
import type { CollectionStats } from "@/lib/data/collections";
import { SmartCollectionIdeas } from "@/components/collections/smart-collection-ideas";
import type { SmartCollectionIdea } from "@/lib/services/smart-collections.service";

interface CollectionsDashboardProps {
  userName: string;
  stats: CollectionStats;
  genres: string[];
  mostLiked: Collection[];
  following: Collection[];
  recentlyUsed: Collection[];
  all: Collection[];
  globalPublic: Collection[];
  /** This week's AI collection ideas built from the user's behaviour. */
  smartIdeas?: SmartCollectionIdea[];
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
          ? "bg-brand-magenta shadow-glow-pink-soft"
          : "border border-brand-magenta/70 bg-transparent hover:bg-brand-magenta/15",
      )}
    >
      {label}
    </button>
  );
}

const statTiles = (stats: CollectionStats) => [
  { emoji: "📒", label: "Collections", value: String(stats.collections) },
  { emoji: "🗂️", label: "Total Items", value: String(stats.totalItems) },
  { emoji: "⭐", label: "Favourites", value: String(stats.favourites) },
  { emoji: "🕐", label: "Last Updated", value: stats.lastUpdated },
];

export function CollectionsDashboard({
  userName,
  stats,
  genres,
  mostLiked,
  following,
  recentlyUsed,
  all,
  globalPublic,
  smartIdeas = [],
}: CollectionsDashboardProps) {
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeSort, setActiveSort] =
    useState<CollectionSortOption>("Recently Updated");

  const filteredMostLiked = useMemo(
    () => applyCollectionListFilters(mostLiked, activeGenre, activeSort),
    [mostLiked, activeGenre, activeSort],
  );
  const filteredFollowing = useMemo(
    () => applyCollectionListFilters(following, activeGenre, activeSort),
    [following, activeGenre, activeSort],
  );
  const filteredRecentlyUsed = useMemo(
    () => applyCollectionListFilters(recentlyUsed, activeGenre, activeSort),
    [recentlyUsed, activeGenre, activeSort],
  );
  const filteredAll = useMemo(
    () => applyCollectionListFilters(all, activeGenre, activeSort),
    [all, activeGenre, activeSort],
  );
  const filteredGlobalPublic = useMemo(
    () => applyCollectionListFilters(globalPublic, activeGenre, activeSort),
    [globalPublic, activeGenre, activeSort],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={userName} variant="collections" />

      <section className="rounded-2xl bg-surface/40 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white sm:text-xl">
            📒 Your Collection
          </h2>
          <CreateCollectionButton />
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
              <span className="text-xl font-bold text-white sm:text-2xl">
                {tile.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <SmartCollectionIdeas initialIdeas={smartIdeas} />

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
            {COLLECTION_SORT_OPTIONS.map((sort) => (
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

      <CollectionGridSection
        title={`⭐ Most Liked Collections  (${filteredMostLiked.length})`}
        searchPlaceholder="Search Liked Collections……. "
        collections={filteredMostLiked}
        editable
      />

      <CollectionGridSection
        title={`👣 Collections You Are Following  (${filteredFollowing.length})`}
        searchPlaceholder="Search followed collections…"
        collections={filteredFollowing}
        emptyMessage="Follow public collections from other creators to see them here."
      />

      <CollectionGridSection
        title="🕐 Recently used"
        searchPlaceholder="Search Recent Collection……. "
        collections={filteredRecentlyUsed}
        editable
      />

      <CollectionGridSection
        title={`📁 Your Collections  (${stats.collections})`}
        searchPlaceholder="Search All Collection…… "
        collections={filteredAll}
        editable
      />

      <CollectionGridSection
        title={`🌍 View Global Public Collections  (${filteredGlobalPublic.length})`}
        searchPlaceholder="Search Public Collections……. "
        collections={filteredGlobalPublic}
      />
    </div>
  );
}
