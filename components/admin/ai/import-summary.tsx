import { ExternalLink, Sparkles, X } from "lucide-react";
import { SOURCE_LABELS, type ContentImportResult } from "@/lib/catalog-import/types";

/** Humanised form field names for the provenance list. */
const FIELD_LABELS: Record<string, string> = {
  title: "Title", nativeTitle: "Native title", type: "Type", description: "Short description", synopsis: "Synopsis",
  imageUrl: "Poster", backdropUrl: "Backdrop", rating: "Rating", year: "Year", meta: "Meta chip",
  creditLabel: "Credit label", highlightTags: "Highlight tags", studio: "Studio", director: "Director",
  originalAuthor: "Original author", sourceMaterial: "Source material", producers: "Producers", network: "Network",
  country: "Country", composer: "Composer", status: "Status", ageRating: "Age rating", imdbRating: "IMDb rating",
  malScore: "MAL score", airedFrom: "Aired from", airedTo: "Aired to", broadcast: "Broadcast",
  episodeDuration: "Episode duration", airingDay: "Airing day", seasonLabel: "Season label", languages: "Languages",
  seasonCount: "Season count", episodeCount: "Episode count", genreLabels: "Genres", seasons: "Seasons",
  episodes: "Episodes", characters: "Characters", accent: "Accent",
};

export function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field;
}

/** What the import filled in, and from where — so the admin knows what to double-check. */
export function ImportSummary({ result, onDismiss }: { result: ContentImportResult; onDismiss: () => void }) {
  const fromSource = Object.entries(result.provenance).filter(([, origin]) => origin !== "ai").map(([field]) => field);
  const fromAi = Object.entries(result.provenance).filter(([, origin]) => origin === "ai").map(([field]) => field);
  const sourceLabel = SOURCE_LABELS[result.source];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Draft imported — review before saving</h2>
          <p className="mt-1 text-xs text-white/60">
            {fromSource.length} fields from {sourceLabel}
            {fromAi.length ? ` · ${fromAi.length} drafted by AI` : ""}. Nothing is saved until you press Create.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss import summary"
          className="-m-1 cursor-pointer rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      {fromAi.length ? (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-white/70">
          <Sparkles className="size-3.5 text-brand-pink" aria-hidden />
          <span className="text-white/55">Drafted by AI — check these:</span>
          {fromAi.map((field) => (
            <span key={field} className="rounded-full bg-white/10 px-2 py-0.5 text-white/85">
              {fieldLabel(field)}
            </span>
          ))}
        </p>
      ) : null}

      {result.notes.length ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-100/90">
          {result.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {result.sourceUrl ? (
          <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-pink hover:underline">
            View on {sourceLabel} <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
        {result.webSources.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[240px] items-center gap-1 truncate text-brand-pink hover:underline">
            {source.title || source.url} <ExternalLink className="size-3 shrink-0" aria-hidden />
          </a>
        ))}
      </div>
      {result.source === "tmdb" ? (
        <p className="text-micro text-white/35">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      ) : null}
    </section>
  );
}
