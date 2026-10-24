"use client";
import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CarouselCardSlot,
  CarouselRowViewport,
} from "@/components/carousel/carousel-row-viewport";
import {
  CarouselSectionProvider,
  useCarouselTintSeed,
} from "@/components/carousel/carousel-section-context";
import { PaginationDots } from "@/components/dashboard/pagination-dots";
import { useAutoAdvanceInterval } from "@/hooks/use-auto-advance-interval";
import {
  CAROUSEL_ITEMS_COMMUNITY,
  CAROUSEL_ITEMS_CONTENT,
  CAROUSEL_ITEMS_EPISODE,
  CAROUSEL_ITEMS_REVIEW,
} from "@/lib/grid-section-config";
import { resolveCardTint } from "@/lib/card-theme";
import type { AccentColor } from "@/lib/catalog-enums";
import { cn } from "@/lib/utils";

export type PaginatedCarouselVariant =
  | "content"
  | "community"
  | "episode"
  | "review";

const VARIANT_ITEMS: Record<PaginatedCarouselVariant, number> = {
  content: CAROUSEL_ITEMS_CONTENT,
  community: CAROUSEL_ITEMS_COMMUNITY,
  episode: CAROUSEL_ITEMS_EPISODE,
  review: CAROUSEL_ITEMS_REVIEW,
};

export interface CarouselSlide {
  id: string;
  node: React.ReactNode;
  /** Catalog accent from admin CMS — matches card background on hover. */
  accent?: AccentColor;
  /** Override hover ambience tint (e.g. review avatar color). */
  tintGlass?: string;
}

export interface PaginatedCarouselSectionProps {
  slides: CarouselSlide[];
  sectionTitle?: string;
  variant?: PaginatedCarouselVariant;
  itemsPerPage?: number;
  className?: string;
  overflowVisible?: boolean;
  itemsCenter?: boolean;
  compact?: boolean;
  autoAdvanceMs?: number;
  /** Spotify-style row wash + sibling fade on card hover. Off for static portrait rows. */
  rowHover?: boolean;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    pages.push(arr.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

function PaginatedCarouselInner({
  slides,
  variant = "content",
  itemsPerPage,
  className,
  overflowVisible = false,
  itemsCenter = false,
  compact = false,
  autoAdvanceMs,
  rowHover = true,
}: Omit<PaginatedCarouselSectionProps, "sectionTitle">) {
  const [page, setPage] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [autoPaused, setAutoPaused] = useState(false);
  const tintSeed = useCarouselTintSeed();
  const perPage = itemsPerPage ?? VARIANT_ITEMS[variant];

  const pages = useMemo(() => chunk(slides, perPage), [slides, perPage]);
  const totalPages = pages.length;
  const safePage = Math.min(page, totalPages - 1);

  const hoveredTintGlass = useMemo(() => {
    if (!rowHover || !hoveredId) return null;
    const slide = slides.find((s) => s.id === hoveredId);
    if (!slide) return null;
    return slide.tintGlass ?? resolveCardTint(slide.id, slide.accent, tintSeed).glass;
  }, [rowHover, hoveredId, slides, tintSeed]);

  function goTo(next: number) {
    const wrapped = ((next % totalPages) + totalPages) % totalPages;
    setPage(wrapped);
    setHoveredId(null);
  }

  const advancePage = useCallback(() => {
    setPage((current) => {
      const safe = Math.min(current, totalPages - 1);
      return (safe + 1) % totalPages;
    });
    setHoveredId(null);
  }, [totalPages]);

  useAutoAdvanceInterval({
    intervalMs: autoAdvanceMs,
    enabled: Boolean(autoAdvanceMs && totalPages > 1),
    paused: autoPaused,
    onAdvance: advancePage,
  });

  const viewportPadding = compact
    ? "px-4 sm:px-8 lg:px-10"
    : variant === "review"
      ? "px-2 sm:px-4 lg:px-5"
      : "px-6 sm:px-10 lg:px-12";

  return (
    <div className={cn("flex flex-col", compact ? "gap-1" : "gap-4", className)}>
      <div
        className={cn("relative", overflowVisible && "overflow-visible")}
        onMouseEnter={() => setAutoPaused(true)}
        onMouseLeave={() => setAutoPaused(false)}
      >
        {totalPages > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safePage - 1)}
            aria-label="Previous page"
            className="absolute -left-1 top-1/2 z-30 -translate-y-1/2 cursor-pointer p-2 text-brand-magenta transition-colors hover:text-brand-pink sm:left-0"
          >
            <ChevronLeft className="size-7" strokeWidth={3} />
          </button>
        ) : null}

        <div
          className={cn(
            viewportPadding,
            overflowVisible ? "overflow-visible" : "overflow-hidden",
          )}
        >
          {(() => {
            const rowClassName = cn(
              "flex transition-transform duration-700 ease-in-out",
              overflowVisible &&
                rowHover &&
                (compact
                  ? "min-h-[220px] items-center sm:min-h-[240px]"
                  : variant === "review"
                    ? "min-h-[310px] items-center sm:min-h-[330px]"
                    : "min-h-[420px] items-center sm:min-h-[440px]"),
            );
            const rowStyle = {
              transform: `translateX(-${safePage * 100}%)`,
            };
            const pageRows = pages.map((pageSlides, pageIndex) => (
              <div
                key={pageIndex}
                className={cn(
                  "flex w-full min-w-full shrink-0",
                  compact ? "gap-2 sm:gap-2.5" : variant === "review" ? "gap-5 sm:gap-6" : "gap-4 sm:gap-6",
                  !rowHover && variant === "review" && "justify-start overflow-visible px-1 sm:px-2",
                  !rowHover && variant !== "review" && "justify-start overflow-hidden",
                  variant === "review" && !rowHover && "items-start",
                  itemsCenter || (overflowVisible && rowHover)
                    ? "items-center"
                    : "items-stretch",
                )}
              >
                {pageSlides.map((slide) =>
                  rowHover ? (
                    <CarouselCardSlot
                      key={slide.id}
                      id={slide.id}
                      hoveredId={hoveredId}
                      onHoverChange={(hovered) =>
                        setHoveredId(hovered ? slide.id : null)
                      }
                    >
                      {slide.node}
                    </CarouselCardSlot>
                  ) : (
                    <div key={slide.id} className="relative shrink-0">
                      {slide.node}
                    </div>
                  ),
                )}
                {rowHover && pageSlides.length < perPage
                  ? Array.from({ length: perPage - pageSlides.length }).map(
                      (_, i) => (
                        <div
                          key={`pad-${i}`}
                          className="min-w-0 flex-1"
                          aria-hidden
                        />
                      ),
                    )
                  : null}
              </div>
            ));

            const viewportClass = cn(
              compact ? "py-1" : variant === "review" ? "py-3 sm:py-4" : "py-4",
              variant === "review" && !rowHover && "min-h-[420px] sm:min-h-[450px]",
            );

            if (rowHover) {
              return (
                <CarouselRowViewport
                  active={hoveredId != null}
                  tintGlass={hoveredTintGlass}
                  className={viewportClass}
                >
                  <div className={rowClassName} style={rowStyle}>
                    {pageRows}
                  </div>
                </CarouselRowViewport>
              );
            }

            return (
              <div className={cn("relative", viewportClass)}>
                <div className={rowClassName} style={rowStyle}>
                  {pageRows}
                </div>
              </div>
            );
          })()}
        </div>

        {totalPages > 1 ? (
          <button
            type="button"
            onClick={() => goTo(safePage + 1)}
            aria-label="Next page"
            className="absolute -right-1 top-1/2 z-30 -translate-y-1/2 cursor-pointer p-2 text-brand-magenta transition-colors hover:text-brand-pink sm:right-0"
          >
            <ChevronRight className="size-7" strokeWidth={3} />
          </button>
        ) : null}
      </div>

      <PaginationDots total={totalPages} current={safePage} onChange={goTo} />
    </div>
  );
}

/**
 * Shared paginated carousel — Spotify-style row ambience on hover,
 * pagination arrows/dots, optional auto-advance. Use on detail routes
 * and any future individual page carousel sections.
 */
export function PaginatedCarouselSection({
  sectionTitle,
  ...props
}: PaginatedCarouselSectionProps) {
  return (
    <CarouselSectionProvider sectionTitle={sectionTitle}>
      <PaginatedCarouselInner {...props} />
    </CarouselSectionProvider>
  );
}
