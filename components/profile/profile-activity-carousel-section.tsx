"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MusicCard } from "@/components/cards/music-card";
import { PosterCard } from "@/components/cards/poster-card";
import {
  CarouselCardSlot,
  CarouselRowViewport,
} from "@/components/carousel/carousel-row-viewport";
import { PaginationDots } from "@/components/dashboard/pagination-dots";
import { SearchPill } from "@/components/dashboard/search-pill";
import { useColumnCount } from "@/hooks/use-column-count";
import { resolveCardTint, sectionTintSeed } from "@/lib/card-theme";
import { CAROUSEL_COLS_BREAKPOINTS } from "@/lib/grid-section-config";
import type { ProfileRecentActivityItem } from "@/types";

const AUTO_ADVANCE_MS = 4000;

export interface ProfileActivityCarouselSectionProps {
  userName: string;
  activitySubtitle?: string;
  items: ProfileRecentActivityItem[];
  emptyMessage?: string;
}

function matchesQuery(entry: ProfileRecentActivityItem, q: string): boolean {
  if (entry.kind === "content") {
    const item = entry.item;
    return (
      item.title.toLowerCase().includes(q) ||
      item.genres.some((genre) => genre.label.toLowerCase().includes(q)) ||
      item.type.toLowerCase().includes(q)
    );
  }
  const track = entry.track;
  return (
    track.title.toLowerCase().includes(q) ||
    track.artist.toLowerCase().includes(q) ||
    track.language?.toLowerCase().includes(q) ||
    track.kind.toLowerCase().includes(q)
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    pages.push(arr.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

/** Recent watch/listen queue — standard app cards with auto-advancing pages. */
export function ProfileActivityCarouselSection({
  userName,
  activitySubtitle,
  items,
  emptyMessage = "No recent watch or listen activity yet.",
}: ProfileActivityCarouselSectionProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [autoPaused, setAutoPaused] = useState(false);
  const { cols, itemsPerPage } = useColumnCount(CAROUSEL_COLS_BREAKPOINTS, 1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((entry) => matchesQuery(entry, q));
  }, [items, query]);

  const pages = useMemo(
    () => chunk(filtered, itemsPerPage),
    [filtered, itemsPerPage],
  );

  const tintSeed = sectionTintSeed(`profile-activity-${userName}`);
  const totalPages = pages.length;
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  const hoveredTintGlass = useMemo(() => {
    if (!hoveredId) return null;
    const entry = filtered.find((item) => item.id === hoveredId);
    if (!entry) return null;
    if (entry.kind === "content") {
      return resolveCardTint(entry.item.id, entry.item.accent, tintSeed).glass;
    }
    return resolveCardTint(entry.track.id, entry.track.accent, tintSeed).glass;
  }, [hoveredId, filtered, tintSeed]);

  function goTo(next: number) {
    if (totalPages <= 0) return;
    const wrapped = ((next % totalPages) + totalPages) % totalPages;
    setPage(wrapped);
    setHoveredId(null);
  }

  function handleSearch(value: string) {
    setQuery(value);
    setPage(0);
    setHoveredId(null);
  }

  const advancePage = useCallback(() => {
    setPage((current) => {
      const safe = Math.min(current, Math.max(0, totalPages - 1));
      return totalPages > 0 ? (safe + 1) % totalPages : 0;
    });
    setHoveredId(null);
  }, [totalPages]);

  useEffect(() => {
    if (autoPaused || totalPages <= 1) return;
    const timer = window.setTimeout(advancePage, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [autoPaused, totalPages, safePage, advancePage]);

  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <div className="min-w-0 px-2">
          <h2 className="text-lg font-bold text-white sm:text-heading">
            ⚡ Recent Activity Of {userName}
          </h2>
          {activitySubtitle ? (
            <p className="mt-1 text-sm text-white/75">{activitySubtitle}</p>
          ) : null}
        </div>
        <p className="mx-2 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/65">
          {emptyMessage}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white sm:text-heading">
            ⚡ Recent Activity Of {userName}
          </h2>
          {activitySubtitle ? (
            <p className="mt-1 text-sm font-normal text-white/90">
              {activitySubtitle}
            </p>
          ) : null}
        </div>
        <SearchPill
          placeholder="Search activity…"
          value={query}
          onChange={handleSearch}
        />
      </div>

      <div
        className="relative px-2"
        onMouseEnter={() => setAutoPaused(true)}
        onMouseLeave={() => setAutoPaused(false)}
      >
        {totalPages > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safePage - 1)}
            aria-label="Previous page"
            className="absolute -left-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-1 text-brand-magenta transition-colors hover:text-brand-pink sm:left-0"
          >
            <ChevronLeft className="size-6" strokeWidth={3} />
          </button>
        ) : null}

        <CarouselRowViewport
          active={hoveredId != null}
          tintGlass={hoveredTintGlass}
        >
          <div className="overflow-hidden">
            <div
              className="flex w-full transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${safePage * 100}%)` }}
            >
              {pages.map((pageItems, pageIndex) => (
                <div
                  key={pageIndex}
                  className="grid w-full min-w-full shrink-0 gap-3 overflow-hidden sm:gap-6"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  }}
                >
                  {pageItems.length > 0 ? (
                    pageItems.map((entry) => (
                      <CarouselCardSlot
                        key={entry.id}
                        id={entry.id}
                        hoveredId={hoveredId}
                      >
                        {entry.kind === "content" ? (
                          <PosterCard
                            item={entry.item}
                            tintSeed={tintSeed}
                            onHoverChange={(hovered) =>
                              setHoveredId(hovered ? entry.id : null)
                            }
                          />
                        ) : (
                          <MusicCard
                            track={entry.track}
                            tintSeed={tintSeed}
                            onHoverChange={(hovered) =>
                              setHoveredId(hovered ? entry.id : null)
                            }
                          />
                        )}
                      </CarouselCardSlot>
                    ))
                  ) : (
                    <p
                      className="text-sm text-muted"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      No results for &ldquo;{query}&rdquo;
                    </p>
                  )}
                  {pageItems.length > 0 && pageItems.length < itemsPerPage
                    ? Array.from({
                        length: itemsPerPage - pageItems.length,
                      }).map((_, i) => (
                        <div key={`pad-${i}`} aria-hidden />
                      ))
                    : null}
                </div>
              ))}
            </div>
          </div>
        </CarouselRowViewport>

        {totalPages > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safePage + 1)}
            aria-label="Next page"
            className="absolute -right-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-1 text-brand-magenta transition-colors hover:text-brand-pink sm:right-0"
          >
            <ChevronRight className="size-6" strokeWidth={3} />
          </button>
        ) : null}
      </div>

      <PaginationDots total={totalPages} current={safePage} onChange={goTo} />
    </section>
  );
}
