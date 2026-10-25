"use client";

import { useMemo, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { ContentCarouselSection } from "@/components/content/content-carousel-section";
import { ContentReviewCard } from "@/components/content/content-review-card";
import {
  AddReviewButton,
  DeleteReviewButton,
  EditReviewButton,
} from "@/components/forms/review-form";
import { ToggleReviewLikeButton } from "@/components/forms/toggle-review-like-button";
import { cn } from "@/lib/utils";
import type { ReviewTargetType } from "@/lib/review-routes";
import type { Review } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Star } from "lucide-react";


export interface InteractiveReviewSectionProps {
  title: string;
  reviews: Review[];
  targetType?: ReviewTargetType;
  targetSlug?: string;
  viewerUserId?: string;
  allowCreate?: boolean;
  subtitle?: string;
  className?: string;
}

export function InteractiveReviewSection({
  title,
  reviews: initialReviews,
  targetType,
  targetSlug,
  viewerUserId,
  allowCreate = true,
  subtitle,
  className,
}: InteractiveReviewSectionProps) {
  const [reviews, setReviews] = useState(initialReviews);
  useOnValueChange(initialReviews, (next) => setReviews(next));

  const ownReview = useMemo(
    () =>
      viewerUserId
        ? reviews.find((review) => review.author.id === viewerUserId)
        : undefined,
    [reviews, viewerUserId],
  );

  function handleCreated(review: Review) {
    setReviews((current) => [review, ...current]);
  }

  function handleUpdated(review: Review) {
    setReviews((current) =>
      current.map((entry) => (entry.id === review.id ? review : entry)),
    );
  }

  function handleDeleted(reviewId: string) {
    setReviews((current) => current.filter((entry) => entry.id !== reviewId));
  }

  const canCreate =
    Boolean(viewerUserId && targetType && targetSlug && allowCreate) &&
    !ownReview;

  function handleReviewLikeChange(reviewId: string, liked: boolean, likeCount: number) {
    setReviews((current) =>
      current.map((entry) =>
        entry.id === reviewId ? { ...entry, liked, likeCount } : entry,
      ),
    );
  }

  const slides = reviews.map((review) => {
    const isOwner = viewerUserId === review.author.id;

    return {
      id: review.id,
      node: (
        <div className="relative px-3 py-4 sm:px-4 sm:py-5">
          {isOwner ? (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-2 py-1 backdrop-blur-sm">
              <EditReviewButton
                review={review}
                trigger="icon"
                onUpdated={handleUpdated}
              />
              <DeleteReviewButton review={review} onDeleted={handleDeleted} />
            </div>
          ) : null}
          <ContentReviewCard review={review} />
          {viewerUserId && review.canLike ? (
            <div className="mt-2 flex justify-center">
              <ToggleReviewLikeButton
                reviewId={review.id}
                initialLiked={review.liked}
                initialLikeCount={review.likeCount ?? 0}
                onChange={(liked, likeCount) =>
                  handleReviewLikeChange(review.id, liked, likeCount)
                }
              />
            </div>
          ) : null}
        </div>
      ),
    };
  });

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
        {viewerUserId && targetType && targetSlug && allowCreate ? (
          canCreate ? (
            <AddReviewButton
              targetType={targetType}
              targetSlug={targetSlug}
              onCreated={handleCreated}
            />
          ) : ownReview ? (
            <EditReviewButton review={ownReview} onUpdated={handleUpdated} />
          ) : null
        ) : null}
      </div>

      {slides.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <ContentCarouselSection
            slides={slides}
            sectionTitle={title}
            variant="review"
            rowHover={false}
            overflowVisible
            className="overflow-visible"
          />
        </div>
      ) : (
        <EmptyState compact icon={<Star />} description="No reviews yet. Be the first to share your take." />
      )}
    </section>
  );
}
