"use client";
import { useCallback, useMemo, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MusicCard } from "@/components/cards/music-card";
import { PosterCard } from "@/components/cards/poster-card";
import { SearchPill } from "@/components/dashboard/search-pill";
import { useAutoAdvanceInterval } from "@/hooks/use-auto-advance-interval";
import { SLOT_W } from "@/lib/card-dimensions";
import { sectionTintSeed } from "@/lib/card-theme";
import {
  COLLECTION_MEDIA_COPY,
  type CollectionMediaVariant,
} from "@/lib/collection-media-copy";
import { cn } from "@/lib/utils";
import type { ContentItem, MusicTrack } from "@/types";

const AUTO_ADVANCE_MS = 3000;
const CARD_GAP = 20;
const CARD_STEP = SLOT_W + CARD_GAP;

const SLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SLIDE_MS = 900;

export interface CollectionHeroSpotlightSliderProps {
  variant?: CollectionMediaVariant;
  items?: ContentItem[];
  tracks?: MusicTrack[];
  /** Override default favourites title (e.g. community "Most Liked Content"). */
  title?: string;
}

/** Favourites row — PosterCards or MusicCards on a smooth sliding track. */
export function CollectionHeroSpotlightSlider({
  variant = "content",
  items = [],
  tracks = [],
  title,
}: CollectionHeroSpotlightSliderProps) {
  const copy = COLLECTION_MEDIA_COPY[variant];
  const spotlightTitle = title ?? copy.spotlightTitle;
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPaused, setAutoPaused] = useState(false);
  const tintSeed = sectionTintSeed(spotlightTitle);
  const isMusic = variant === "music";

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.genres.some((genre) => genre.label.toLowerCase().includes(q)),
    );
  }, [items, query]);

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        track.language?.toLowerCase().includes(q),
    );
  }, [tracks, query]);

  const filtered = isMusic ? filteredTracks : filteredItems;
  const safeIndex =
    filtered.length > 0 ? activeIndex % filtered.length : 0;

  function goTo(next: number) {
    if (filtered.length === 0) return;
    setActiveIndex(
      ((next % filtered.length) + filtered.length) % filtered.length,
    );
  }

  useOnValueChange(`${query}|${variant}`, () => setActiveIndex(0));

  const advanceSlide = useCallback(() => {
    setActiveIndex((current) => (current + 1) % filtered.length);
  }, [filtered.length]);

  useAutoAdvanceInterval({
    intervalMs: AUTO_ADVANCE_MS,
    enabled: filtered.length > 1,
    paused: autoPaused,
    onAdvance: advanceSlide,
  });

  return (
    <div className="mt-1 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-white sm:text-base">
          {spotlightTitle}
        </h2>
        <SearchPill
          placeholder="Search…"
          value={query}
          onChange={setQuery}
          className="max-w-[220px]"
        />
      </div>

      <div
        className="relative py-4"
        onMouseEnter={() => setAutoPaused(true)}
        onMouseLeave={() => setAutoPaused(false)}
      >
        {filtered.length > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1)}
            aria-label="Previous favourite"
            className="absolute -left-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-2 text-brand-magenta transition-colors hover:text-brand-pink sm:left-0"
          >
            <ChevronLeft className="size-7" strokeWidth={3} />
          </button>
        ) : null}

        <div className="overflow-hidden px-8 sm:px-12">
          <div
            className="flex min-h-[300px] items-center will-change-transform sm:min-h-[320px]"
            style={{
              gap: CARD_GAP,
              transform: `translateX(calc(50% - ${SLOT_W / 2}px - ${safeIndex * CARD_STEP}px))`,
              transition: `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
            }}
          >
            {filtered.length > 0 ? (
              isMusic ? (
                filteredTracks.map((track, index) => {
                  const isActive = index === safeIndex;
                  const distance = Math.min(
                    Math.abs(index - safeIndex),
                    filteredTracks.length - Math.abs(index - safeIndex),
                  );
                  const isNeighbor = distance === 1;

                  return (
                    <div
                      key={track.id}
                      className={cn(
                        "pointer-events-none relative shrink-0",
                        isActive
                          ? "z-10 scale-100 opacity-100"
                          : isNeighbor
                            ? "z-0 scale-[0.88] opacity-50"
                            : "z-0 scale-[0.82] opacity-35",
                      )}
                      style={{
                        transition: `opacity ${SLIDE_MS}ms ${SLIDE_EASE}, transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
                      }}
                    >
                      <MusicCard track={track} tintSeed={tintSeed} />
                    </div>
                  );
                })
              ) : (
                filteredItems.map((item, index) => {
                  const isActive = index === safeIndex;
                  const distance = Math.min(
                    Math.abs(index - safeIndex),
                    filteredItems.length - Math.abs(index - safeIndex),
                  );
                  const isNeighbor = distance === 1;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "pointer-events-none relative shrink-0",
                        isActive
                          ? "z-10 scale-100 opacity-100"
                          : isNeighbor
                            ? "z-0 scale-[0.88] opacity-50"
                            : "z-0 scale-[0.82] opacity-35",
                      )}
                      style={{
                        transition: `opacity ${SLIDE_MS}ms ${SLIDE_EASE}, transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
                      }}
                    >
                      <PosterCard item={item} tintSeed={tintSeed} />
                    </div>
                  );
                })
              )
            ) : (
              <p className="w-full py-8 text-center text-sm text-muted">
                {copy.emptySpotlight}
              </p>
            )}
          </div>
        </div>

        {filtered.length > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex + 1)}
            aria-label="Next favourite"
            className="absolute -right-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-2 text-brand-magenta transition-colors hover:text-brand-pink sm:right-0"
          >
            <ChevronRight className="size-7" strokeWidth={3} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
