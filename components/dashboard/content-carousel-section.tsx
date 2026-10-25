"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clapperboard, SearchX } from "lucide-react";
import { ArtistCard } from "@/components/cards/artist-card";
import { PosterCard } from "@/components/cards/poster-card";
import {
  CarouselCardSlot,
  CarouselRowViewport,
} from "@/components/carousel/carousel-row-viewport";
import { PaginationDots } from "@/components/dashboard/pagination-dots";
import { SearchPill } from "@/components/dashboard/search-pill";
import { CAROUSEL_AUTOPLAY_MS, useCarouselAutoplay } from "@/hooks/use-carousel-autoplay";
import { useColumnCount } from "@/hooks/use-column-count";
import { resolveCardTint, sectionTintSeed } from "@/lib/card-theme";
import { pageItems } from "@/lib/carousel-pages";
import { CAROUSEL_COLS_BREAKPOINTS, CAROUSEL_FIT } from "@/lib/grid-section-config";
import type { ContentItem } from "@/types";
import { EmptyState, type EmptyStateLink } from "@/components/ui/empty-state";

export interface ContentCarouselSectionProps {
  title: string;
  subtitle?: string;
  searchPlaceholder: string;
  items: ContentItem[];
  /** Auto-advance pages (ms) — for related-content rows only. */
  /** Auto-slide interval; defaults to the shared 5s beat, 0 turns it off. */
  autoAdvanceMs?: number;
  emptyMessage?: string;
  /** Next useful action shown with the empty state. */
  emptyAction?: EmptyStateLink;
}

function filterContent(items: ContentItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.genres.some((g) => g.label.toLowerCase().includes(q)) ||
      item.type.toLowerCase().includes(q),
  );
}

/** Paginated content row — responsive columns, strict clip, no bleed. */
export function ContentCarouselSection({
  title,
  subtitle,
  searchPlaceholder,
  items,
  autoAdvanceMs = CAROUSEL_AUTOPLAY_MS,
  emptyAction = { href: "/dashboard/discover", label: "Discover titles" },
  emptyMessage = "No related content available yet.",
}: ContentCarouselSectionProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const { cols, itemsPerPage } = useColumnCount(CAROUSEL_COLS_BREAKPOINTS, 1, { ref: rowRef, ...CAROUSEL_FIT });

  const filtered = useMemo(
    () => filterContent(items, query),
    [items, query],
  );

  const pages = useMemo(
    () => pageItems(filtered, itemsPerPage),
    [filtered, itemsPerPage],
  );

  const tintSeed = sectionTintSeed(title);
  const totalPages = pages.length;
  const safePage = Math.min(page, totalPages - 1);

  const hoveredTintGlass = useMemo(() => {
    if (!hoveredId) return null;
    const item = filtered.find((i) => i.id === hoveredId);
    if (!item) return null;
    return resolveCardTint(item.id, item.accent, tintSeed).glass;
  }, [hoveredId, filtered, tintSeed]);

  function goTo(next: number) {
    const wrapped =
      ((next % totalPages) + totalPages) % totalPages;
    setPage(wrapped);
    setHoveredId(null);
  }

  function handleSearch(value: string) {
    setQuery(value);
    setPage(0);
    setHoveredId(null);
  }

  const stepPage = useCallback((direction: 1 | -1) => {
    setPage((current) => {
      const safe = Math.min(current, totalPages - 1);
      return (safe + direction + totalPages) % totalPages;
    });
    setHoveredId(null);
  }, [totalPages]);

  useCarouselAutoplay({
    rootRef,
    intervalMs: autoAdvanceMs,
    enabled: Boolean(autoAdvanceMs && totalPages > 1),
    onStep: stepPage,
    resetKey: safePage,
  });

  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="px-2 text-lg font-bold text-white sm:text-xl">{title}</h2>
        <div className="px-2">
          <EmptyState compact icon={<Clapperboard />} description={emptyMessage} action={emptyAction} />
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm font-normal text-white/80">{subtitle}</p>
          ) : null}
        </div>
        <SearchPill
          placeholder={searchPlaceholder}
          value={query}
          onChange={handleSearch}
        />
      </div>

      <div ref={rootRef} className="relative px-2">
        {totalPages > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safePage - 1)}
            aria-label="Previous page"
            className="absolute -left-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-2 text-brand-magenta transition-colors hover:text-brand-pink sm:left-0"
          >
            <ChevronLeft className="size-6" strokeWidth={3} />
          </button>
        ) : null}

        <CarouselRowViewport
          active={hoveredId != null}
          tintGlass={hoveredTintGlass}
        >
          {/* Clip the other pages sideways only — hovered cards grow taller than the row. */}
          <div ref={rowRef} className="-my-7 overflow-hidden py-7">
            <div
              className="flex w-full transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${safePage * 100}%)` }}
            >
              {pages.map((pageItems, pageIndex) => (
                <div
                  key={pageIndex}
                  className="grid w-full min-w-full shrink-0 overflow-hidden"
                  style={{
                    columnGap: CAROUSEL_FIT.gap,
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  }}
                >
                  {pageItems.length > 0 ? (
                    pageItems.map((item) => (
                      <CarouselCardSlot
                        key={item.id}
                        id={item.id}
                        hoveredId={hoveredId}
                      >
                        {item.type === "artist" ? (
                          <ArtistCard
                            item={item}
                            tintSeed={tintSeed}
                            onHoverChange={(hovered) =>
                              setHoveredId(hovered ? item.id : null)
                            }
                          />
                        ) : (
                          <PosterCard
                            item={item}
                            tintSeed={tintSeed}
                            onHoverChange={(hovered) =>
                              setHoveredId(hovered ? item.id : null)
                            }
                          />
                        )}
                      </CarouselCardSlot>
                    ))
                  ) : (
                    <div style={{ gridColumn: "1 / -1" }}>
                <EmptyState compact icon={<SearchX />} description={<>No results for &ldquo;{query}&rdquo;. Try another title or genre.</>} />
              </div>
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
            className="absolute -right-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-2 text-brand-magenta transition-colors hover:text-brand-pink sm:right-0"
          >
            <ChevronRight className="size-6" strokeWidth={3} />
          </button>
        ) : null}
      </div>

      <PaginationDots
        total={totalPages}
        current={safePage}
        onChange={goTo}
      />
    </section>
  );
}

