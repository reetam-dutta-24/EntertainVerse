import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
}

/** Placeholder block with the brand shimmer sweep. Purely decorative. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "skeleton-shimmer relative overflow-hidden rounded-md bg-white/[0.07]",
        className,
      )}
    />
  );
}

/** Screen-reader announcement for a loading region (visual skeletons are aria-hidden). */
export function LoadingStatus({ label = "Loading…" }: { label?: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}
