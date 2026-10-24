"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/brand-colors";

interface UserSearchResult {
  id: string;
  handle: string;
  name: string;
  portraitUrl?: string;
  avatarColor?: string;
}

interface UserHandleSearchInputProps {
  value: string;
  onChange: (handle: string) => void;
  onSelect?: (user: UserSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function UserHandleSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "Search by handle or name…",
  disabled = false,
  className,
}: UserHandleSearchInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [fetching, setLoading] = useState(false);
  const [fetchedResults, setResults] = useState<UserSearchResult[]>([]);
  const queryActive = value.trim().length >= 2;
  const results = queryActive ? fetchedResults : [];
  const loading = queryActive && fetching;
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) return;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(q)}&limit=8`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as { users: UserSearchResult[] };
        setResults(data.users);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pickUser(user: UserSearchResult) {
    onChange(user.handle);
    onSelect?.(user);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!open || results.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              pickUser(results[activeIndex]!);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/35 focus:border-brand-pink/50"
        />
      </div>

      {open && value.trim().length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-white/10 bg-popover-deep py-1 shadow-xl"
        >
          {loading ? (
            <li className="px-3 py-2 text-xs text-white/50">Searching users…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-white/50">No users found.</li>
          ) : (
            results.map((user, index) => (
              <li key={user.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickUser(user)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-white/5",
                    index === activeIndex && "bg-white/8",
                  )}
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-micro font-bold text-white"
                    style={{ backgroundColor: user.avatarColor ?? BRAND_COLORS.purple }}
                  >
                    {user.name.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-white">
                      {user.name}
                    </span>
                    <span className="block truncate text-caption text-white/55">
                      @{user.handle}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
