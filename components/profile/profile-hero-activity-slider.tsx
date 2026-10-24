"use client";
import { useCallback, useMemo, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { MusicCard } from "@/components/cards/music-card";
import { PosterCard } from "@/components/cards/poster-card";
import { SearchPill } from "@/components/dashboard/search-pill";
import { GradientButton } from "@/components/ui/gradient-button";
import { useAutoAdvanceInterval } from "@/hooks/use-auto-advance-interval";
import { SLOT_W } from "@/lib/card-dimensions";
import { sectionTintSeed } from "@/lib/card-theme";
import { cn } from "@/lib/utils";
import type { ProfileRecentActivityItem } from "@/types";

const AUTO_ADVANCE_MS = 3000;
const CARD_GAP = 20;
const CARD_STEP = SLOT_W + CARD_GAP;
const SLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SLIDE_MS = 900;

export interface ProfileHeroActivitySliderProps {
  userName: string;
  activitySubtitle?: string;
  items: ProfileRecentActivityItem[];
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

/** Hero-embedded recent activity — mixed PosterCards/MusicCards, center-focused. */
export function ProfileHeroActivitySlider({
  userName,
  activitySubtitle,
  items,
}: ProfileHeroActivitySliderProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPaused, setAutoPaused] = useState(false);
  const tintSeed = sectionTintSeed("profile-recent-activity");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((entry) => matchesQuery(entry, q));
  }, [items, query]);

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
    <div className="mt-1 flex min-h-0 flex-1 flex-col gap-2 lg:gap-2">
      <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white sm:text-base">
            ⚡ Recent Activity Of {userName}
          </h2>
          {activitySubtitle ? (
            <p className="mt-0.5 text-xs text-white/75 sm:text-sm">
              {activitySubtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <SearchPill
            placeholder="Search …"
            value={query}
            onChange={setQuery}
            className="max-w-[180px]"
          />
          <GradientButton
            size="sm"
            className="h-8 gap-1.5 rounded-full px-4 text-xs"
          >
            <Play className="size-3.5 fill-current" />
            Play Collection
          </GradientButton>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 py-1"
        onMouseEnter={() => setAutoPaused(true)}
        onMouseLeave={() => setAutoPaused(false)}
      >
        {filtered.length > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1)}
            aria-label="Previous activity"
            className="absolute -left-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-2 text-brand-magenta transition-colors hover:text-brand-pink sm:left-0"
          >
            <ChevronLeft className="size-7" strokeWidth={3} />
          </button>
        ) : null}

        <div className="h-full overflow-hidden px-8 sm:px-10">
          <div
            className="flex h-full min-h-[200px] items-center will-change-transform lg:min-h-0"
            style={{
              gap: CARD_GAP,
              transform: `translateX(calc(50% - ${SLOT_W / 2}px - ${safeIndex * CARD_STEP}px))`,
              transition: `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
            }}
          >
            {filtered.length > 0 ? (
              filtered.map((entry, index) => {
                const isActive = index === safeIndex;
                const distance = Math.min(
                  Math.abs(index - safeIndex),
                  filtered.length - Math.abs(index - safeIndex),
                );
                const isNeighbor = distance === 1;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "pointer-events-none relative shrink-0 origin-center scale-[0.82] sm:scale-[0.88] lg:scale-[0.8]",
                      isActive
                        ? "z-10 opacity-100"
                        : isNeighbor
                          ? "z-0 opacity-50"
                          : "z-0 opacity-35",
                    )}
                    style={{
                      transition: `opacity ${SLIDE_MS}ms ${SLIDE_EASE}, transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
                    }}
                  >
                    {entry.kind === "content" ? (
                      <PosterCard item={entry.item} tintSeed={tintSeed} />
                    ) : (
                      <MusicCard track={entry.track} tintSeed={tintSeed} />
                    )}
                  </div>
                );
              })
            ) : (
              <p className="w-full py-8 text-center text-sm text-muted">
                No activity matches your search.
              </p>
            )}
          </div>
        </div>

        {filtered.length > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex + 1)}
            aria-label="Next activity"
            className="absolute -right-1 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-2 text-brand-magenta transition-colors hover:text-brand-pink sm:right-0"
          >
            <ChevronRight className="size-7" strokeWidth={3} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
