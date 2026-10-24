import type { ContentFormInput } from "@/lib/validators/admin/content";

/** Where an imported value came from — shown to the admin next to the draft. */
export type CatalogSource = "tmdb" | "anilist" | "web";

export const SOURCE_LABELS: Record<CatalogSource, string> = {
  tmdb: "TMDB",
  anilist: "AniList",
  web: "Web search",
};

/** One search hit the admin can pick before importing. */
export interface CatalogCandidate {
  source: Exclude<CatalogSource, "web">;
  sourceId: string;
  /** TMDB needs to know which endpoint to call. */
  tmdbKind?: "movie" | "tv";
  title: string;
  originalTitle?: string;
  year?: number;
  kindLabel: string;
  overview?: string;
  imageUrl?: string;
}

/**
 * Normalised facts from a metadata source. `facts` is a compact JSON object
 * passed to the model for the judgment fields; `draft` holds the values mapped
 * directly in code (dates, counts, episodes, cast) so they are never invented.
 */
export interface SourceFacts {
  source: CatalogSource;
  sourceId: string;
  sourceUrl: string;
  draft: Partial<ContentFormInput>;
  facts: Record<string, unknown>;
}

export type FieldProvenance = Partial<Record<keyof ContentFormInput, CatalogSource | "ai">>;

export interface ContentImportResult {
  draft: ContentFormInput;
  provenance: FieldProvenance;
  source: CatalogSource;
  sourceUrl?: string;
  /** Cited pages when the web fallback was used. */
  webSources: { title: string; url: string }[];
  notes: string[];
  /** Facts handed to the reviewer later, so it can check the form against them. */
  facts: Record<string, unknown>;
}
