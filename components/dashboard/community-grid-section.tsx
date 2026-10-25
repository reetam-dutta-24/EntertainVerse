"use client";

import { useMemo, useState, useRef } from "react";
import { CommunityCard } from "@/components/cards/community-card";
import { PaginationDots } from "@/components/dashboard/pagination-dots";
import { SearchPill } from "@/components/dashboard/search-pill";
import { useColumnCount } from "@/hooks/use-column-count";
import {
  CARD_GRID_COLS_BREAKPOINTS,
  CARD_GRID_FIT,
  COMMUNITY_GRID_ROWS,
} from "@/lib/grid-section-config";
import type { Community } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchX } from "lucide-react";

export interface CommunityGridSectionProps {
  title: string;
  searchPlaceholder: string;
  communities: Community[];
  ctaMode?: "view" | "join";
}

/** Paginated community grid — responsive columns, pagination dots only. */
export function CommunityGridSection({
  title,
  searchPlaceholder,
  communities,
  ctaMode = "view",
}: CommunityGridSectionProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const { cols, itemsPerPage } = useColumnCount(CARD_GRID_COLS_BREAKPOINTS, COMMUNITY_GRID_ROWS, { ref: gridRef, ...CARD_GRID_FIT });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [communities, query]);

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
            pageItems.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                ctaMode={ctaMode}
              />
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
      </div>

      <PaginationDots total={totalPages} current={safePage} onChange={setPage} />
    </section>
  );
}
