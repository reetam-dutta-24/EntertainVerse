"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchPillProps {
  placeholder: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

/** Slim magenta-outlined search input used in section headers. */
export function SearchPill({
  placeholder,
  className,
  value = "",
  onChange,
}: SearchPillProps) {
  return (
    <label
      className={cn(
        "flex h-9 w-full min-w-0 items-center gap-2 rounded-full border border-brand-magenta bg-surface/40 px-4 transition-colors focus-within:border-brand-pink sm:w-[230px] sm:max-w-[230px]",
        className,
      )}
    >
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/80 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
      />
      <Search className="size-3.5 shrink-0 text-white" />
    </label>
  );
}
