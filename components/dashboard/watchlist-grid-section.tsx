"use client";

import { useMemo, useState } from "react";
import { PosterCard } from "@/components/cards/poster-card";
import {
  CarouselCardSlot,
  CarouselRowViewport,
} from "@/components/dashboard/carousel-row-viewport";
import { PaginationDots } from "@/components/dashboard/pagination-dots";
import { SearchPill } from "@/components/dashboard/search-pill";
import { useColumnCount } from "@/hooks/use-column-count";
import { resolveCardTint, sectionTintSeed } from "@/lib/card-theme";
import {
  GRID_ROWS,
  POSTER_GRID_COLS_BREAKPOINTS,
} from "@/lib/grid-section-config";
import type { ContentItem } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchX } from "lucide-react";

export interface WatchlistGridSectionProps {
  title: string;
  searchPlaceholder: string;
  items: ContentItem[];
  action?: React.ReactNode;
}

/** Paginated poster grid — responsive columns, pagination dots only. */
export function WatchlistGridSection({
  title,
  searchPlaceholder,
  items,
  action,
}: WatchlistGridSectionProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { cols, itemsPerPage } = useColumnCount(
    POSTER_GRID_COLS_BREAKPOINTS,
    GRID_ROWS,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.genres.some((g) => g.label.toLowerCase().includes(q)) ||
        item.type.toLowerCase().includes(q),
    );
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(
    safePage * itemsPerPage,
    safePage * itemsPerPage + itemsPerPage,
  );
  const emptySlots = Math.max(0, itemsPerPage - pageItems.length);

  const tintSeed = sectionTintSeed(title);

  const hoveredTintGlass = useMemo(() => {
    if (!hoveredId) return null;
    const item = filtered.find((i) => i.id === hoveredId);
    if (!item) return null;
    return resolveCardTint(item.id, item.accent, tintSeed).glass;
  }, [hoveredId, filtered, tintSeed]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <SearchPill
            placeholder={searchPlaceholder}
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(0);
              setHoveredId(null);
            }}
          />
          {action}
        </div>
      </div>

      <div className="px-2">
        <CarouselRowViewport
          active={hoveredId != null}
          tintGlass={hoveredTintGlass}
        >
          <div
            className="grid justify-items-center gap-3 px-2 py-2 sm:gap-6"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {pageItems.length > 0 ? (
              pageItems.map((item) => (
                <CarouselCardSlot
                  key={item.watchlistItemId ?? item.id}
                  id={item.id}
                  hoveredId={hoveredId}
                >
                  <PosterCard
                    item={item}
                    tintSeed={tintSeed}
                    onHoverChange={(hovered) =>
                      setHoveredId(hovered ? item.id : null)
                    }
                  />
                </CarouselCardSlot>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1" }}>
                <EmptyState compact icon={<SearchX />} description={<>No results for &ldquo;{query}&rdquo;. Try another title or genre.</>} />
              </div>
            )}
            {pageItems.length > 0 && emptySlots > 0
              ? Array.from({ length: emptySlots }).map((_, i) => (
                  <div key={`pad-${i}`} aria-hidden />
                ))
              : null}
          </div>
        </CarouselRowViewport>
      </div>

      <PaginationDots
        total={totalPages}
        current={safePage}
        onChange={(next) => {
          setPage(next);
          setHoveredId(null);
        }}
      />
    </section>
  );
}

