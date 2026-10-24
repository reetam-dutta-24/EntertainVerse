"use client";
import { useCallback, useMemo, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { MusicCard } from "@/components/cards/music-card";
import { SearchPill } from "@/components/dashboard/search-pill";
import { GradientButton } from "@/components/ui/gradient-button";
import { useAutoAdvanceInterval } from "@/hooks/use-auto-advance-interval";
import { SLOT_W } from "@/lib/card-dimensions";
import { sectionTintSeed } from "@/lib/card-theme";
import { cn } from "@/lib/utils";
import type { MusicTrack } from "@/types";

const CARD_GAP = 20;
const CARD_STEP = SLOT_W + CARD_GAP;
const SLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SLIDE_MS = 900;
const AUTO_ADVANCE_MS = 3000;

export interface ArtistHeroTrendingSliderProps {
  title: string;
  tracks: MusicTrack[];
}

/** Hero-embedded trending row — center-focused MusicCards, 3s auto-advance. */
export function ArtistHeroTrendingSlider({
  title,
  tracks,
}: ArtistHeroTrendingSliderProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPaused, setAutoPaused] = useState(false);
  const tintSeed = sectionTintSeed(title);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        track.language?.toLowerCase().includes(q),
    );
  }, [tracks, query]);

  const safeIndex =
    filtered.length > 0 ? activeIndex % filtered.length : 0;

  function goTo(next: number) {
    if (filtered.length === 0) return;
    setActiveIndex(
      ((next % filtered.length) + filtered.length) % filtered.length,
    );
  }

  useOnValueChange(query, () => setActiveIndex(0));

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
    <div className="mt-2 flex flex-col gap-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-white sm:text-base">{title}</h2>
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchPill
            placeholder="Search …"
            value={query}
            onChange={setQuery}
            className="max-w-[180px]"
          />
          <GradientButton size="sm" className="h-8 gap-1.5 rounded-full px-4 text-xs">
            <Play className="size-3.5 fill-current" />
            Play
          </GradientButton>
        </div>
      </div>

      <div
        className="relative py-2"
        onMouseEnter={() => setAutoPaused(true)}
        onMouseLeave={() => setAutoPaused(false)}
      >
        {filtered.length > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1)}
            aria-label="Previous trending song"
            className="absolute -left-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-1 text-brand-magenta transition-colors hover:text-brand-pink sm:left-0"
          >
            <ChevronLeft className="size-7" strokeWidth={3} />
          </button>
        ) : null}

        <div className="overflow-hidden px-8 sm:px-10">
          <div
            className="flex min-h-[280px] items-center will-change-transform sm:min-h-[300px]"
            style={{
              gap: CARD_GAP,
              transform: `translateX(calc(50% - ${SLOT_W / 2}px - ${safeIndex * CARD_STEP}px))`,
              transition: `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
            }}
          >
            {filtered.length > 0 ? (
              filtered.map((track, index) => {
                const isActive = index === safeIndex;
                const distance = Math.min(
                  Math.abs(index - safeIndex),
                  filtered.length - Math.abs(index - safeIndex),
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
              <p className="w-full py-8 text-center text-sm text-muted">
                No songs match your search.
              </p>
            )}
          </div>
        </div>

        {filtered.length > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex + 1)}
            aria-label="Next trending song"
            className="absolute -right-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-1 text-brand-magenta transition-colors hover:text-brand-pink sm:right-0"
          >
            <ChevronRight className="size-7" strokeWidth={3} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
