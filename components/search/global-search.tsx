"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppRouter } from "@/hooks/use-app-router";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult, SearchResultType } from "@/lib/search/types";

const TYPE_LABELS: Record<SearchResultType, string> = {
  content: "Content",
  song: "Song",
  artist: "Artist",
  profile: "Profile",
  collection: "Collection",
  community: "Community",
};

export interface GlobalSearchProps {
  className?: string;
  inputClassName?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}

/** Navbar global search — autocomplete panel + `/search?q=` navigation. */
export function GlobalSearch({
  className,
  inputClassName,
  initialQuery = "",
  autoFocus = false,
}: GlobalSearchProps) {
  const router = useAppRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [fetching, setLoading] = useState(false);
  const [fetchedResults, setResults] = useState<SearchResult[]>([]);
  const queryActive = query.trim().length >= 2;
  const results = queryActive ? fetchedResults : [];
  const loading = queryActive && fetching;
  const [activeIndex, setActiveIndex] = useState(-1);

  const submitSearch = useCallback(
    (value: string) => {
      const q = value.trim();
      if (!q) return;
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [router],
  );

  // Keep the box in sync with the URL on /search, or with a new initial query elsewhere.
  const externalQuery =
    pathname === "/search" ? (searchParams.get("q") ?? "") : initialQuery || null;
  useOnValueChange(externalQuery, (next) => {
    if (next !== null) setQuery(next);
  });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&limit=8`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <label
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-full border border-white/25 bg-surface/60 px-4 transition-colors focus-within:border-brand-magenta",
          inputClassName,
        )}
      >
        <input
          role="combobox"
          type="search"
          value={query}
          autoFocus={autoFocus}
          placeholder="Search Here…………………"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (activeIndex >= 0 && results[activeIndex]) {
                router.push(results[activeIndex].href);
                setOpen(false);
                return;
              }
              submitSearch(query);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, -1));
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-muted/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
        />
        <button
          type="button"
          aria-label="Search"
          onClick={() => submitSearch(query)}
          className="shrink-0 text-white/80 transition-colors hover:text-white"
        >
          <Search className="size-4" />
        </button>
      </label>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+8px)] z-[60] max-h-[min(60dvh,420px)] w-full overflow-y-auto rounded-2xl border border-white/10 bg-surface/95 p-2 shadow-section-dim backdrop-blur-xl"
        >
          {loading ? (
            <p className="px-3 py-4 text-sm text-white/55">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-white/55">No matches yet.</p>
          ) : (
            <ul role="none" className="flex flex-col gap-0.5">
              {results.map((result, index) => (
                <li key={`${result.type}-${result.id}`} role="none">
                  <Link
                    href={result.href}
                    role="option"
                    aria-selected={index === activeIndex}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                      index === activeIndex
                        ? "bg-white/10"
                        : "hover:bg-white/[0.06]",
                    )}
                  >
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-black/40">
                      {result.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.imageUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-xs font-bold text-white/70">
                          {result.title.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs text-white/50">
                        {TYPE_LABELS[result.type]}
                        {result.subtitle ? ` · ${result.subtitle}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => submitSearch(query)}
            className="mt-1 w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-left text-sm font-medium text-brand-pink transition-colors hover:bg-white/[0.07]"
          >
            See all results for &ldquo;{query.trim()}&rdquo;
          </button>
        </div>
      ) : null}
    </div>
  );
}
