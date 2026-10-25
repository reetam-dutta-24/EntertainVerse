"use client";

import { useMemo, useState, useRef } from "react";
import { CollectionCard } from "@/components/cards/collection-card";
import { PaginationDots } from "@/components/dashboard/pagination-dots";
import { SearchPill } from "@/components/dashboard/search-pill";
import { useColumnCount } from "@/hooks/use-column-count";
import {
  CARD_GRID_COLS_BREAKPOINTS,
  CARD_GRID_FIT,
  COMMUNITY_GRID_ROWS,
} from "@/lib/grid-section-config";
import type { Collection } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Library, SearchX } from "lucide-react";

export interface CollectionGridSectionProps {
  title: string;
  searchPlaceholder: string;
  collections: Collection[];
  /** Mark cards as user-owned so edit/delete actions appear. */
  editable?: boolean;
  /** @deprecated Use `editable` for all cards in the section. */
  highlightFirst?: boolean;
  emptyMessage?: string;
}

/** Paginated collection grid — responsive columns, pagination dots only. */
export function CollectionGridSection({
  title,
  searchPlaceholder,
  collections,
  editable = false,
  highlightFirst = false,
  emptyMessage = "No collections in this section yet.",
}: CollectionGridSectionProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const { cols, itemsPerPage } = useColumnCount(CARD_GRID_COLS_BREAKPOINTS, COMMUNITY_GRID_ROWS, { ref: gridRef, ...CARD_GRID_FIT });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [collections, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(
    safePage * itemsPerPage,
    safePage * itemsPerPage + itemsPerPage,
  );
  const emptySlots = Math.max(0, itemsPerPage - pageItems.length);

  return (
    <section className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
        <SearchPill
          placeholder={searchPlaceholder}
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(0);
          }}
        />
      </div>

      <div className="px-2 pt-1 pb-2 sm:pt-2">
        <div
          ref={gridRef}
          className="grid justify-items-center gap-y-4"
          style={{
            columnGap: CARD_GRID_FIT.gap,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {pageItems.length > 0 ? (
            pageItems.map((collection, i) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                editable={editable || (highlightFirst && i === 0 && safePage === 0)}
              />
            ))
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              {query.trim() ? (
                <EmptyState compact icon={<SearchX />} description={`No results for “${query}”.`} />
              ) : (
                <EmptyState compact icon={<Library />} description={emptyMessage} action={{ href: "/dashboard/collections", label: "Browse collections" }} />
              )}
            </div>
          )}
          {pageItems.length > 0 && emptySlots > 0
            ? Array.from({ length: emptySlots }).map((_, i) => (
                <div key={`pad-${i}`} aria-hidden />
              ))
            : null}
        </div>
      </div>

      <PaginationDots total={totalPages} current={safePage} onChange={setPage} />
    </section>
  );
}
