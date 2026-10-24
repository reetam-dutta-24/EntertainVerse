"use client";

import { cn } from "@/lib/utils";

export interface PaginationDotsProps {
  total: number;
  current: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Dot indicators for carousel/grid page navigation. */
export function PaginationDots({
  total,
  current,
  onChange,
  className,
}: PaginationDotsProps) {
  if (total <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to page ${i + 1}`}
          aria-current={i === current ? "page" : undefined}
          onClick={() => onChange(i)}
          className={cn(
            // Invisible ::before pad gives each 8px dot a 40px touch target.
            "relative size-2 cursor-pointer rounded-full transition-all duration-200 before:absolute before:-inset-4 before:content-['']",
            i === current
              ? "w-5 bg-brand-magenta shadow-glow-pink-soft"
              : "bg-white/25 hover:bg-white/45",
          )}
        />
      ))}
    </div>
  );
}
