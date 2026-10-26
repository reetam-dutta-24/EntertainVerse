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
    <div className={cn("flex items-center justify-center", className)}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to page ${i + 1}`}
          aria-current={i === current ? "page" : undefined}
          onClick={() => onChange(i)}
          // 24px hit box (WCAG 2.5.8) around the small visual dot.
          className="group flex h-6 min-w-6 cursor-pointer items-center justify-center px-1"
        >
          <span
            aria-hidden
            className={cn(
              "block h-2 rounded-full transition-all duration-200",
              i === current
                ? "w-5 bg-brand-magenta shadow-glow-pink-soft"
                : "w-2 bg-white/25 group-hover:bg-white/45",
            )}
          />
        </button>
      ))}
    </div>
  );
}
