import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Two-line blurb in a card's hover panel. Recommended cards show the
 * recommender's "why this" reason instead of the generic description.
 */
export function CardBlurb({ reason, text, className }: { reason?: string; text: string; className?: string }) {
  return (
    <p
      className={cn(
        "h-8 w-full overflow-hidden text-caption font-normal leading-4 line-clamp-2",
        reason ? "text-brand-pink" : "text-white/80",
        className,
      )}
      title={reason ? `Why this? ${reason}` : undefined}
    >
      {reason ? (
        <>
          <Sparkles className="me-1 inline size-3 -translate-y-px" aria-hidden />
          <span className="sr-only">Why this: </span>
          {reason}
        </>
      ) : (
        text
      )}
    </p>
  );
}
