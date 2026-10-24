"use client";

import { useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { SearchPill } from "@/components/dashboard/search-pill";

export interface SectionCarouselProps {
  /** Section heading, e.g. "🚀 Trending This Week". Omit for scroll-only rows. */
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  /** Hide the decorative expand chevron under the row. */
  hideExpand?: boolean;
  children: React.ReactNode;
}

/**
 * Dashboard content row: optional heading + search, horizontally scrollable
 * cards with arrow controls.
 */
export function SectionCarousel({
  title,
  subtitle,
  searchPlaceholder,
  hideExpand = false,
  children,
}: SectionCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const showHeader = Boolean(title || searchPlaceholder);

  function scrollByCards(direction: 1 | -1) {
    scrollRef.current?.scrollBy({
      left: direction * (scrollRef.current.clientWidth - 100),
      behavior: "smooth",
    });
  }

  return (
    <section className="flex flex-col gap-2">
      {showHeader ? (
        <div className="flex flex-col gap-3 px-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 sm:px-4 lg:px-6">
          {title ? (
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white sm:text-xl">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-sm text-white/90">{subtitle}</p>
              ) : null}
            </div>
          ) : null}
          {searchPlaceholder ? (
            <SearchPill placeholder={searchPlaceholder} />
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 cursor-pointer p-1 text-brand-magenta transition-colors hover:text-brand-pink sm:left-1"
        >
          <ChevronLeft className="size-6 sm:size-7" strokeWidth={3} />
        </button>
        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 overflow-x-auto px-8 py-4 [scrollbar-width:none] sm:gap-6 sm:px-10 lg:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
        <button
          type="button"
          onClick={() => scrollByCards(1)}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 cursor-pointer p-1 text-brand-magenta transition-colors hover:text-brand-pink sm:right-1"
        >
          <ChevronRight className="size-6 sm:size-7" strokeWidth={3} />
        </button>
      </div>

      {!hideExpand && title ? (
        <ChevronDown
          className="mx-auto size-5 text-brand-magenta"
          strokeWidth={3}
          aria-hidden
        />
      ) : null}
    </section>
  );
}
