import type { ArtistFormInput } from "@/lib/validators/admin/artist";
import type { ContentFormInput } from "@/lib/validators/admin/content";
import type { MusicFormInput } from "@/lib/validators/admin/music";

/** Where an imported value came from — shown to the admin next to the draft. */
export type CatalogSource = "tmdb" | "anilist" | "itunes" | "deezer" | "musicbrainz" | "web";

export const SOURCE_LABELS: Record<CatalogSource, string> = {
  tmdb: "TMDB",
  anilist: "AniList",
  itunes: "Apple Music",
  deezer: "Deezer",
  musicbrainz: "MusicBrainz",
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
export interface SourceFacts<T = ContentFormInput> {
  source: CatalogSource;
  sourceId: string;
  sourceUrl: string;
  draft: Partial<T>;
  facts: Record<string, unknown>;
}

export type FieldProvenance<T = ContentFormInput> = Partial<Record<keyof T, CatalogSource | "ai">>;

export interface CatalogImportResult<T> {
  draft: T;
  provenance: FieldProvenance<T>;
  source: CatalogSource;
  sourceUrl?: string;
  /** Cited pages when the web fallback was used. */
  webSources: { title: string; url: string }[];
  notes: string[];
  /** Facts handed to the reviewer later, so it can check the form against them. */
  facts: Record<string, unknown>;
}

export type ContentImportResult = CatalogImportResult<ContentFormInput>;
export type MusicImportResult = CatalogImportResult<MusicFormInput>;
export type ArtistImportResult = CatalogImportResult<ArtistFormInput>;
