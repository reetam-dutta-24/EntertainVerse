"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReviewCard } from "@/components/cards/review-card";
import { ScrollFadeIn } from "@/components/landing/scroll-fade-in";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";
import type { Review } from "@/types";

const AUTO_ADVANCE_MS = 3000;
const CARD_W = 314;
const CARD_GAP = 28;
const SLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SLIDE_MS = 800;

export interface ReviewsSectionProps {
  reviews: Review[];
}

/** "Loved by fans worldwide" — center-focused review slider, auto-advances every 3s. */
export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cardW, setCardW] = useState(CARD_W);
  const timeoutRef = useRef<number | null>(null);

  const count = reviews.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;
  const cardStep = cardW + CARD_GAP;

  // Shrink the card on narrow phones so the active slide stays fully visible.
  useEffect(() => {
    function updateWidth() {
      setCardW(Math.min(CARD_W, window.innerWidth - 104));
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  function goTo(next: number) {
    if (count === 0) return;
    setActiveIndex(((next % count) + count) % count);
  }

  useEffect(() => {
    if (count <= 1 || paused) return;
    timeoutRef.current = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [safeIndex, paused, count]);

  if (count === 0) return null;

  return (
    <section
      id="reviews"
      className="flex w-full scroll-mt-[72px] flex-col items-center gap-10 bg-surface px-4 py-16 sm:px-6"
    >
      <ScrollFadeIn>
        <SectionHeader
          title="What fans can share on AniVerse"
          subtitle="Example reviews — real member reviews live on every title, song and collection page"
        />
      </ScrollFadeIn>

      <ScrollFadeIn delay={0.12} amount={0.25}>
      <div
        className="relative w-full max-w-[1200px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {count > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1)}
            aria-label="Previous review"
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-1 text-brand-magenta transition-colors hover:text-brand-pink sm:left-2"
          >
            <ChevronLeft className="size-7" strokeWidth={3} />
          </button>
        ) : null}

        <div className="w-full overflow-hidden px-9 sm:px-12">
          <div
            className="flex flex-nowrap items-stretch py-4 will-change-transform"
            style={{
              gap: CARD_GAP,
              transform: `translateX(calc(50% - ${cardW / 2}px - ${safeIndex * cardStep}px))`,
              transition: `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
            }}
          >
            {reviews.map((review, index) => {
              const distance = Math.min(
                Math.abs(index - safeIndex),
                count - Math.abs(index - safeIndex),
              );
              const isActive = index === safeIndex;

              return (
                <div
                  key={review.id}
                  className={cn(
                    "shrink-0 origin-center",
                    isActive
                      ? "z-10 scale-100 opacity-100"
                      : distance === 1
                        ? "z-0 scale-[0.92] opacity-50"
                        : "z-0 scale-[0.88] opacity-30",
                  )}
                  style={{
                    transition: `opacity ${SLIDE_MS}ms ${SLIDE_EASE}, transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
                  }}
                >
                  <ReviewCard
                    review={review}
                    style={{ width: cardW }}
                    className={cn("h-full", isActive && "shadow-glow-pink")}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {count > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex + 1)}
            aria-label="Next review"
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 cursor-pointer p-1 text-brand-magenta transition-colors hover:text-brand-pink sm:right-2"
          >
            <ChevronRight className="size-7" strokeWidth={3} />
          </button>
        ) : null}
      </div>
      </ScrollFadeIn>

      {count > 1 ? (
        <ScrollFadeIn delay={0.2}>
        <div className="flex items-center gap-2">
          {reviews.map((review, index) => (
            <button
              key={review.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to review ${index + 1}`}
              className={cn(
                "h-2 cursor-pointer rounded-full transition-all duration-500",
                index === safeIndex
                  ? "w-6 bg-gradient-brand"
                  : "w-2 bg-white/25 hover:bg-white/50",
              )}
            />
          ))}
        </div>
        </ScrollFadeIn>
      ) : null}
    </section>
  );
}
