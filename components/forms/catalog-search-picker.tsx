"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult, SearchResultType } from "@/lib/search/types";

const TYPE_LABELS: Record<SearchResultType, string> = {
  content: "Show / Movie",
  song: "Music",
  artist: "Artist",
  profile: "Profile",
  collection: "Collection",
  community: "Community",
};

const DEFAULT_ALLOWED_TYPES: SearchResultType[] = ["content", "song"];
const EMPTY_EXCLUDE_IDS: string[] = [];

export interface CatalogPickerSelection {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

function toSelection(result: SearchResult): CatalogPickerSelection {
  return {
    id: result.id,
    type: result.type,
    title: result.title,
    subtitle: result.subtitle,
    imageUrl: result.imageUrl,
  };
}

interface CatalogSearchInputProps {
  allowedTypes?: SearchResultType[];
  excludeIds?: string[];
  placeholder?: string;
  onSelect: (selection: CatalogPickerSelection) => void;
  autoFocus?: boolean;
  /** Use admin CMS search API (DB-backed, higher limits). */
  adminSearch?: boolean;
  resultLimit?: number;
  /** When false, empty focus won't open a full browse panel (avoids covering selected items). */
  browseOnFocus?: boolean;
  /** Clicks inside this node should not close the dropdown (e.g. selected-item list). */
  ignoreOutsidePointerRef?: React.RefObject<HTMLElement | null>;
  /** Increment to force-close the results panel (e.g. when removing a selected item). */
  dismissSignal?: number;
}

function CatalogSearchInput({
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  excludeIds = EMPTY_EXCLUDE_IDS,
  placeholder = "Search titles, artists, anime…",
  onSelect,
  autoFocus = false,
  adminSearch = false,
  resultLimit = 12,
  browseOnFocus = true,
  ignoreOutsidePointerRef,
  dismissSignal = 0,
}: CatalogSearchInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [fetching, setLoading] = useState(false);
  const [fetchedResults, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetchError, setSearchError] = useState<string | null>(null);
  const [panelRect, setPanelRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const allowedTypesKey = useMemo(() => allowedTypes.join(","), [allowedTypes]);
  const excludeIdsKey = useMemo(() => excludeIds.join(","), [excludeIds]);
  const canBrowse = adminSearch && browseOnFocus && query.trim().length === 0;
  // Non-admin search needs 2+ characters; shorter queries show nothing.
  const queryActive = adminSearch || query.trim().length >= 2;
  const results = queryActive ? fetchedResults : [];
  const loading = queryActive && fetching;
  const searchError = queryActive ? fetchError : null;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useOnValueChange(dismissSignal, (signal) => {
    if (signal > 0) setOpen(false);
  });

  useEffect(() => {
    const q = query.trim();
    const minLength = adminSearch ? 0 : 2;
    if (!adminSearch && q.length < minLength) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const limit = adminSearch ? Math.max(resultLimit, 24) : resultLimit;
        const params = new URLSearchParams({
          q,
          limit: String(limit),
          types: allowedTypesKey,
        });
        if (canBrowse) params.set("browse", "1");
        const endpoint = adminSearch
          ? `/api/admin/catalog-search?${params.toString()}`
          : `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`;
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setResults([]);
          setSearchError(
            response.status === 403 || response.status === 401
              ? "You do not have permission to search the catalog."
              : "Catalog search failed. Try again.",
          );
          return;
        }
        const data = (await response.json()) as { results: SearchResult[] };
        const exclude = new Set(excludeIdsKey ? excludeIdsKey.split(",") : []);
        const allowedTypeSet = new Set(
          allowedTypesKey.split(",").filter(Boolean) as SearchResultType[],
        );
        setResults(
          data.results.filter(
            (result) =>
              allowedTypeSet.has(result.type) && !exclude.has(result.id),
          ),
        );
        setActiveIndex(-1);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
        setSearchError("Catalog search failed. Check your connection.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, adminSearch ? 150 : 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    query,
    allowedTypesKey,
    excludeIdsKey,
    adminSearch,
    resultLimit,
    canBrowse,
  ]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (ignoreOutsidePointerRef?.current?.contains(target)) return;
      const panel = document.getElementById(listId);
      if (panel?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [listId, ignoreOutsidePointerRef]);

  useEffect(() => {
    if (!open || !rootRef.current) {
      setPanelRect(null);
      return;
    }

    function updatePanelRect() {
      const node = rootRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setPanelRect({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePanelRect();
    window.addEventListener("resize", updatePanelRect);
    window.addEventListener("scroll", updatePanelRect, true);
    return () => {
      window.removeEventListener("resize", updatePanelRect);
      window.removeEventListener("scroll", updatePanelRect, true);
    };
  }, [open, query, results.length, loading]);

  function pickResult(result: SearchResult) {
    onSelect(toSelection(result));
    setQuery("");
    setOpen(true);
    setResults([]);
    setActiveIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const showPanel =
    open &&
    (adminSearch
      ? query.trim().length > 0 || canBrowse
      : query.trim().length >= 2) &&
    typeof document !== "undefined";

  const resultsPanel =
    showPanel && panelRect ? (
      <div
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          top: panelRect.top,
          left: panelRect.left,
          width: panelRect.width,
          zIndex: 9999,
        }}
        className="max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-popover-deep p-1.5 shadow-2xl"
      >
        {loading ? (
          <p className="px-3 py-4 text-sm text-white/55">Searching…</p>
        ) : searchError ? (
          <p className="px-3 py-4 text-sm text-amber-200">{searchError}</p>
        ) : results.length === 0 ? (
          <p className="px-3 py-4 text-sm text-white/55">
            {excludeIds.length > 0
              ? "No more matches — try a different search."
              : canBrowse
                ? "No matches in the catalog yet."
                : "No matches found."}
          </p>
        ) : (
          <ul role="none" className="flex flex-col gap-0.5">
            {canBrowse && !loading ? (
              <li aria-hidden="true" className="px-3 py-2 text-micro font-medium uppercase tracking-wide text-white/40">
                Catalog artists
              </li>
            ) : null}
            {results.map((result, index) => (
              <li key={`${result.type}-${result.id}`} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickResult(result)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
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
                    <span className="block truncate text-sm font-medium text-white">
                      {result.title}
                    </span>
                    <span className="block truncate text-xs text-white/55">
                      {TYPE_LABELS[result.type]}
                      {result.subtitle ? ` · ${result.subtitle}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-popover px-3 py-2.5 transition focus-within:border-brand-magenta/60 focus-within:ring-1 focus-within:ring-brand-magenta/30">
        <Search className="size-4 shrink-0 text-white/45" />
        <input
          role="combobox"
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          aria-expanded={showPanel}
          aria-controls={listId}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, -1));
            }
            if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
              event.preventDefault();
              pickResult(results[activeIndex]);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
        />
      </label>

      {resultsPanel ? createPortal(resultsPanel, document.body) : null}
    </div>
  );
}

interface CatalogSearchPickerProps {
  allowedTypes?: SearchResultType[];
  value: CatalogPickerSelection | null;
  onChange: (selection: CatalogPickerSelection | null) => void;
  placeholder?: string;
  hint?: string;
  showHint?: boolean;
  adminSearch?: boolean;
  resultLimit?: number;
  autoFocus?: boolean;
}

interface CatalogMultiSearchPickerProps {
  allowedTypes?: SearchResultType[];
  values: string[];
  onChange: (slugs: string[]) => void;
  onSelectionsChange?: (selections: CatalogPickerSelection[]) => void;
  placeholder?: string;
  hint?: string;
  maxItems?: number;
  /** Slugs already in the target collection — hidden from search and blocked on add. */
  blockedIds?: string[];
  /** Known slug → type map for edit forms (keeps remove/save accurate before labels load). */
  typeHints?: Record<string, SearchResultType>;
  adminSearch?: boolean;
  resultLimit?: number;
}

function SelectionCard({
  selection,
  onClear,
}: {
  selection: CatalogPickerSelection;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-popover p-3">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-black/40">
        {selection.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selection.imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-sm font-bold text-white/70">
            {selection.title.charAt(0)}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{selection.title}</p>
        <p className="truncate text-xs text-white/55">
          {TYPE_LABELS[selection.type]}
          {selection.subtitle ? ` · ${selection.subtitle}` : ""}
        </p>
      </div>
      <button
        type="button"
        aria-label="Clear selection"
        onClick={onClear}
        className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function CatalogSearchPicker({
  allowedTypes = ["content", "song"],
  value,
  onChange,
  placeholder = "Search titles, artists, anime…",
  hint = "Type to search the catalog.",
  showHint = true,
  adminSearch = false,
  resultLimit = 12,
  autoFocus = false,
}: CatalogSearchPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <SelectionCard selection={value} onClear={() => onChange(null)} />
      ) : (
        <CatalogSearchInput
          allowedTypes={allowedTypes}
          placeholder={placeholder}
          onSelect={onChange}
          autoFocus={autoFocus}
          adminSearch={adminSearch}
          resultLimit={resultLimit}
        />
      )}

      {showHint && !value ? (
        <p className="text-xs text-white/40">
          {adminSearch
            ? "Click to browse the catalog, or type to search by title or slug."
            : hint}
        </p>
      ) : null}
    </div>
  );
}

export function CatalogMultiSearchPicker({
  allowedTypes = ["content"],
  values,
  onChange,
  onSelectionsChange,
  placeholder = "Search and add more…",
  hint = "Search, pick an item, then keep searching to add more — all in one go.",
  maxItems = 24,
  blockedIds = [],
  typeHints = {},
  adminSearch = false,
  resultLimit = 12,
}: CatalogMultiSearchPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  const [labels, setLabels] = useState<Record<string, CatalogPickerSelection>>({});
  const [duplicateNotice, setDuplicateNotice] = useState<string>();
  const [dismissSignal, setDismissSignal] = useState(0);
  const allowedTypesKey = useMemo(() => allowedTypes.join(","), [allowedTypes]);
  const typeHintsKey = useMemo(() => JSON.stringify(typeHints), [typeHints]);
  const valuesKey = useMemo(() => values.join(","), [values]);

  function resolveSelection(
    id: string,
    source: Record<string, CatalogPickerSelection>,
  ): CatalogPickerSelection {
    if (source[id]) return source[id];
    return {
      id,
      type: typeHints[id] ?? allowedTypes[0]!,
      title: id,
    };
  }

  function syncSelections(
    nextValues: string[],
    nextLabels: Record<string, CatalogPickerSelection>,
  ) {
    onChange(nextValues);
    onSelectionsChange?.(nextValues.map((id) => resolveSelection(id, nextLabels)));
  }

  useEffect(() => {
    if (!adminSearch || values.length === 0) return;

    let cancelled = false;
    const missing = values.filter((id) => !labels[id]);
    if (missing.length === 0) return;

    async function hydrate() {
      const resolved = await Promise.all(
        missing.map(async (id) => {
          const hinted = typeHints[id];
          const typesToTry = hinted ? [hinted] : allowedTypes;
          for (const type of typesToTry) {
            try {
              const response = await fetch(
                `/api/admin/catalog-search?slug=${encodeURIComponent(id)}&type=${type}`,
                { cache: "no-store" },
              );
              if (!response.ok) continue;
              const data = (await response.json()) as { results: SearchResult[] };
              if (data.results[0]) return toSelection(data.results[0]);
            } catch {
              /* try next type */
            }
          }
          return resolveSelection(id, labels);
        }),
      );

      if (cancelled) return;
      setLabels((current) => {
        const next = { ...current };
        for (const item of resolved) next[item.id] = item;
        return next;
      });
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
    // Hydrate only when values/type hints change — not on every labels update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSearch, valuesKey, typeHintsKey, allowedTypesKey]);

  function addSelection(selection: CatalogPickerSelection) {
    if (blockedIds.includes(selection.id)) {
      setDuplicateNotice(`"${selection.title}" is already in this collection.`);
      return;
    }
    if (values.includes(selection.id)) {
      setDuplicateNotice(`"${selection.title}" is already selected.`);
      return;
    }
    if (values.length >= maxItems) return;
    setDuplicateNotice(undefined);
    const nextLabels = { ...labels, [selection.id]: selection };
    setLabels(nextLabels);
    syncSelections([...values, selection.id], nextLabels);
  }

  function remove(slug: string) {
    setDismissSignal((count) => count + 1);
    const nextValues = values.filter((value) => value !== slug);
    const nextLabels = { ...labels };
    delete nextLabels[slug];
    setLabels(nextLabels);
    syncSelections(nextValues, nextLabels);
  }

  const atLimit = values.length >= maxItems;

  return (
    <div ref={pickerRef} className="relative flex flex-col gap-2">
      {values.length > 0 ? (
        <ul className="relative z-10 flex flex-col gap-2">
          {values.map((slug) => {
            const meta = labels[slug] ?? resolveSelection(slug, labels);
            return (
              <li key={slug}>
                <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-popover p-2.5">
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-black/40">
                    {meta?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={meta.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-xs font-bold text-white/70">
                        {(meta?.title ?? slug).charAt(0)}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {meta?.title ?? slug}
                    </p>
                    <p className="truncate text-xs text-white/55">
                      {TYPE_LABELS[meta.type]}
                      {meta.subtitle ? ` · ${meta.subtitle}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${meta?.title ?? slug}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(slug);
                    }}
                    className="relative z-10 shrink-0 cursor-pointer rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {atLimit ? (
        <p className="text-xs text-white/45">Maximum of {maxItems} items reached.</p>
      ) : (
        <CatalogSearchInput
          allowedTypes={allowedTypes}
          excludeIds={[...blockedIds, ...values]}
          placeholder={placeholder}
          onSelect={addSelection}
          autoFocus={values.length === 0}
          adminSearch={adminSearch}
          resultLimit={resultLimit}
          browseOnFocus={values.length === 0}
          ignoreOutsidePointerRef={pickerRef}
          dismissSignal={dismissSignal}
        />
      )}

      {duplicateNotice ? (
        <p className="text-xs text-amber-200" role="alert">
          {duplicateNotice}
        </p>
      ) : null}

      {!atLimit ? (
        <p className="text-xs text-white/40">
          {values.length > 0
            ? `${values.length} selected — search again to add more.`
            : hint}
        </p>
      ) : null}
    </div>
  );
}
