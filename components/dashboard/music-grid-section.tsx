"use client";

import { useEffect, useMemo, useState } from "react";
import { MusicCard } from "@/components/cards/music-card";
import {
  CarouselCardSlot,
  CarouselRowViewport,
} from "@/components/dashboard/carousel-row-viewport";
import { PaginationDots } from "@/components/dashboard/pagination-dots";
import { SearchPill } from "@/components/dashboard/search-pill";
import { resolveCardTint, sectionTintSeed } from "@/lib/card-theme";
import { MUSIC_GRID_ITEMS_PER_PAGE } from "@/lib/grid-section-config";
import type { MusicTrack } from "@/types";

export interface MusicGridSectionProps {
  title: string;
  searchPlaceholder: string;
  tracks: MusicTrack[];
  action?: React.ReactNode;
}

function filterTracks(tracks: MusicTrack[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return tracks;
  return tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.source?.toLowerCase().includes(q) ||
      t.language?.toLowerCase().includes(q),
  );
}

/** Paginated music grid — 6×3 on desktop (18 tracks per page). */
export function MusicGridSection({
  title,
  searchPlaceholder,
  tracks,
  action,
}: MusicGridSectionProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const itemsPerPage = MUSIC_GRID_ITEMS_PER_PAGE;

  const filtered = useMemo(
    () => filterTracks(tracks, query),
    [tracks, query],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const pageTracks = filtered.slice(
    safePage * itemsPerPage,
    safePage * itemsPerPage + itemsPerPage,
  );
  const emptySlots = Math.max(0, itemsPerPage - pageTracks.length);
  const tintSeed = sectionTintSeed(title);

  const hoveredTintGlass = useMemo(() => {
    if (!hoveredId) return null;
    const track = filtered.find((t) => t.id === hoveredId);
    if (!track) return null;
    return resolveCardTint(track.id, track.accent, tintSeed).glass;
  }, [hoveredId, filtered, tintSeed]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, totalPages - 1)));
  }, [totalPages]);

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
            className="grid grid-cols-2 justify-items-center gap-3 px-2 py-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 xl:gap-5"
          >
            {pageTracks.length > 0 ? (
              pageTracks.map((track) => (
                <CarouselCardSlot
                  key={track.id}
                  id={track.id}
                  hoveredId={hoveredId}
                >
                  <MusicCard
                    track={track}
                    tintSeed={tintSeed}
                    onHoverChange={(hovered) =>
                      setHoveredId(hovered ? track.id : null)
                    }
                  />
                </CarouselCardSlot>
              ))
            ) : (
              <p
                className="text-sm text-muted"
                style={{ gridColumn: `1 / -1` }}
              >
                No results for &ldquo;{query}&rdquo;
              </p>
            )}
            {pageTracks.length > 0 && emptySlots > 0
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
