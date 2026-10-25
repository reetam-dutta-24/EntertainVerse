import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRating } from "@/lib/format-rating";
import type { Review } from "@/types";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Chip } from "@/components/ui/chip";

export interface ReviewCardProps extends React.HTMLAttributes<HTMLDivElement> {
  review: Review;
}

/** Member review card (314×437 in Figma). */
export function ReviewCard({ review, className, ...props }: ReviewCardProps) {
  return (
    <div
      className={cn(
        "flex w-[314px] flex-col gap-3 rounded-card bg-glass-purple p-5 shadow-card-inner transition-shadow duration-300 hover:shadow-glow-pink",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {/* Landing-page testimonials — the authors aren't real AniVerse profiles. */}
        <AvatarStack users={[review.author]} size="md" linkProfiles={false} />
        <div className="flex flex-col">
          <p className="text-base font-semibold text-white">
            {review.author.name}
          </p>
          {review.createdAt ? (
            <p className="text-xs text-muted">{review.createdAt}</p>
          ) : null}
        </div>
        <Chip variant="brand" className="ms-auto gap-1">
          <Star className="size-3.5 fill-current" />
          {formatRating(review.rating)}/10
        </Chip>
      </div>
      <p className="flex-1 text-sm leading-relaxed text-white">
        {review.content}
      </p>
      {review.likeCount != null ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Heart className="size-4 text-brand-magenta" />
          {review.likeCount.toLocaleString()} found this helpful
        </p>
      ) : null}
    </div>
  );
}
