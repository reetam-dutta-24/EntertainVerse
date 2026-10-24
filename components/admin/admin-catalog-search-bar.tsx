"use client";

import { useEffect, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppRouter } from "@/hooks/use-app-router";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminCatalogSearchBarProps {
  defaultQuery?: string;
  placeholder?: string;
  className?: string;
}

/** Debounced catalog search — syncs `?q=` on the current admin list route. */
export function AdminCatalogSearchBar({
  defaultQuery = "",
  placeholder = "Search by title, slug, artist, or native name…",
  className,
}: AdminCatalogSearchBarProps) {
  const router = useAppRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultQuery);
  useOnValueChange(defaultQuery, (next) => setQuery(next));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = query.trim();
      const current = searchParams.get("q") ?? "";
      if (trimmed === current) return;

      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      params.delete("page");

      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, pathname, router, searchParams]);

  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-xl border border-white/15 bg-[#1a0f2e] px-3 py-2.5 transition focus-within:border-brand-magenta/60 focus-within:ring-1 focus-within:ring-brand-magenta/30",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-white/45" aria-hidden />
      <input
        type="search"
        value={query}
        placeholder={placeholder}
        onChange={(event) => setQuery(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
        aria-label="Search catalog"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setQuery("")}
          className="rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </label>
  );
}
