"use client";

import { cn } from "@/lib/utils";
import { ContentCarouselSection } from "@/components/content/content-carousel-section";
import { ContentReviewCard } from "@/components/content/content-review-card";
import type { Review } from "@/types";


export interface ContentReviewSectionProps {
  title: string;
  reviews: Review[];
  action?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

/**
 * Reusable review carousel — compact cards, avatar-colored glow, auto-advance every 3s.
 */
export function ContentReviewSection({
  title,
  reviews,
  action,
  subtitle,
  className,
}: ContentReviewSectionProps) {
  const slides = reviews.map((review) => ({
    id: review.id,
    node: <ContentReviewCard review={review} />,
  }));

  return (
    <section
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white sm:text-heading">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-white/80">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <ContentCarouselSection
        slides={slides}
        sectionTitle={title}
        variant="review"
        rowHover={false}
      />
    </section>
  );
}
