"use client";

import { useState } from "react";
import { Globe, LoaderCircle, Search, Sparkles } from "lucide-react";
import { SOURCE_LABELS, type CatalogCandidate, type ContentImportResult } from "@/lib/catalog-import/types";
import { cn } from "@/lib/utils";

const TYPE_HINTS = [
  { value: "", label: "Any type" },
  { value: "anime", label: "Anime" },
  { value: "show", label: "Show" },
  { value: "kdrama", label: "K-Drama" },
  { value: "movie", label: "Movie" },
  { value: "documentary", label: "Documentary" },
] as const;

export interface ContentImportPanelProps {
  aiEnabled: boolean;
  tmdbEnabled: boolean;
  /** e.g. "Google Gemini" — shown so the admin knows which model drafts fields. */
  providerLabel?: string;
  onImported: (result: ContentImportResult) => void;
}

/**
 * Search TMDB / AniList for a title, pick the right match, and let Claude draft
 * the catalog entry from the source facts. Falls back to web research.
 */
export function ContentImportPanel({ aiEnabled, tmdbEnabled, providerLabel, onImported }: ContentImportPanelProps) {
  const [query, setQuery] = useState("");
  const [typeHint, setTypeHint] = useState<(typeof TYPE_HINTS)[number]["value"]>("");
  const [candidates, setCandidates] = useState<CatalogCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/ai/content/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = (await response.json()) as { candidates?: CatalogCandidate[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Search failed.");
      setCandidates(data.candidates ?? []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function runImport(key: string, body: Record<string, unknown>) {
    setImportingKey(key);
    setError(null);
    try {
      const response = await fetch("/api/admin/ai/content/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { result?: ContentImportResult; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error ?? "Import failed.");
      onImported(data.result);
      setCandidates(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.");
    } finally {
      setImportingKey(null);
    }
  }

  const busy = searching || importingKey !== null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand-purple/30 bg-brand-purple/[0.06] p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-pink">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white">Import with AI</h2>
          <p className="mt-1 text-xs text-white/55">
            Search a title — facts come from {tmdbEnabled ? "TMDB (movies, shows, K-dramas) and " : ""}AniList (anime), and
            {providerLabel ?? "the AI model"} drafts the editorial fields. You review everything before saving.
          </p>
        </div>
      </div>

      {!aiEnabled ? (
        <p className="rounded-xl border border-amber-300/30 bg-amber-300/[0.08] px-4 py-3 text-xs text-amber-100">
          AI import needs a model key. Add <code className="font-mono">GEMINI_API_KEY</code> (free, from Google AI
          Studio) or <code className="font-mono">ANTHROPIC_API_KEY</code> to <code className="font-mono">.env.local</code>{" "}
          and restart the server.
        </p>
      ) : (
        <>
          <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-white/40" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. Frieren, Breaking Bad, Parasite"
                aria-label="Title to import"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
              />
            </label>
            <button
              type="submit"
              disabled={busy || query.trim().length < 2}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              Search
            </button>
          </form>
          {!tmdbEnabled ? (
            <p className="text-xs text-white/45">
              Only anime sources are on. Add <code className="font-mono">TMDB_API_KEY</code> for movies, shows and K-dramas.
            </p>
          ) : null}

          {candidates ? (
            candidates.length === 0 ? (
              <p className="text-sm text-white/60">No matches in the metadata sources.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {candidates.map((candidate) => {
                  const key = `${candidate.source}:${candidate.sourceId}`;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runImport(key, {
                            mode: "source",
                            source: candidate.source,
                            sourceId: candidate.sourceId,
                            tmdbKind: candidate.tmdbKind,
                          })
                        }
                        className={cn(
                          "flex w-full cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition-colors hover:border-brand-magenta/50 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60",
                          importingKey === key && "border-brand-magenta/60",
                        )}
                      >
                        {candidate.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={candidate.imageUrl} alt="" className="h-20 w-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="h-20 w-14 shrink-0 rounded-lg bg-white/10" />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate text-sm font-semibold text-white">{candidate.title}</span>
                          <span className="text-caption text-white/55">
                            {[candidate.kindLabel, candidate.year].filter(Boolean).join(" · ")} · {SOURCE_LABELS[candidate.source]}
                          </span>
                          {candidate.overview ? (
                            <span className="line-clamp-2 text-caption text-white/45">{candidate.overview}</span>
                          ) : null}
                        </span>
                        {importingKey === key ? (
                          <LoaderCircle className="size-4 shrink-0 animate-spin self-center text-brand-pink" aria-label="Importing" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}

          {candidates ? (
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center">
              <span className="text-xs text-white/55">Not listed or wrong?</span>
              <select
                value={typeHint}
                onChange={(event) => setTypeHint(event.target.value as typeof typeHint)}
                aria-label="Type hint for web search"
                className="h-9 rounded-lg border border-white/15 bg-popover px-2 text-xs text-white"
              >
                {TYPE_HINTS.map((hint) => (
                  <option key={hint.value} value={hint.value}>
                    {hint.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runImport("web", { mode: "web", query, typeHint: typeHint || undefined })}
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/20 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importingKey === "web" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Globe className="size-3.5" aria-hidden />}
                Research on the web instead
              </button>
            </div>
          ) : null}

          {importingKey ? (
            <p role="status" className="text-xs text-white/55">
              {importingKey === "web"
                ? "Researching on the web and drafting the entry — this can take a minute…"
                : "Fetching facts and drafting the entry — usually 15–40 seconds…"}
            </p>
          ) : null}
        </>
      )}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
