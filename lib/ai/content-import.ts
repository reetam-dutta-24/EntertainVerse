import "server-only";

import { z } from "zod";
import { ACCENT_OPTIONS, CONTENT_GENRE_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/catalog-enums";
import { activeProviderLabel, generateStructured, researchWithWeb } from "@/lib/ai/provider";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import { contentMediaTypes, type ContentFormInput } from "@/lib/validators/admin/content";
import { fetchAnilistFacts, searchAnilist } from "@/lib/catalog-import/sources/anilist";
import { fetchTmdbFacts, isTmdbConfigured, searchTmdb } from "@/lib/catalog-import/sources/tmdb";
import type {
  CatalogCandidate,
  ContentImportResult,
  FieldProvenance,
  SourceFacts,
} from "@/lib/catalog-import/types";

const genreValues = CONTENT_GENRE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const languageValues = LANGUAGE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const accentValues = ACCENT_OPTIONS.map((o) => o.value) as [string, ...string[]];

/** Editorial fields the model fills on top of the facts mapped in code. */
const enrichmentSchema = z.object({
  type: z.enum(contentMediaTypes),
  description: z.string(),
  synopsis: z.string(),
  genreLabels: z.array(z.enum(genreValues)),
  languages: z.array(z.enum(languageValues)),
  highlightTags: z.array(z.string()),
  creditLabel: z.string(),
  accent: z.enum(accentValues),
  // Fixed vocabularies keep every provider on the house format.
  status: z.enum(["Airing", "Completed", "Released", "Upcoming", ""]),
  ageRating: z.enum(["7+", "13+", "16+", "17+", "18+", ""]),
  sourceMaterial: z.enum(["Manga", "Light Novel", "Novel", "Webtoon", "Comic", "Video Game", "Original", ""]),
  originalAuthor: z.string(),
  country: z.string(),
  broadcast: z.string(),
  airingDay: z.string(),
  notes: z.array(z.string()),
});

/** Web fallback: no structured source, so the model also fills the factual fields. */
const webDraftSchema = enrichmentSchema.extend({
  title: z.string(),
  nativeTitle: z.string(),
  year: z.number().nullable(),
  rating: z.number().nullable(),
  imdbRating: z.number().nullable(),
  malScore: z.number().nullable(),
  studio: z.string(),
  director: z.string(),
  composer: z.string(),
  producers: z.string(),
  network: z.string(),
  airedFrom: z.string(),
  airedTo: z.string(),
  episodeDuration: z.string(),
  seasonCount: z.number().nullable(),
  episodeCount: z.number().nullable(),
  seasons: z.array(z.object({ label: z.string(), episodeCount: z.number().nullable() })),
  characters: z.array(z.object({ name: z.string(), role: z.string(), voiceActor: z.string() })),
});

const STYLE_GUIDE = `You prepare catalog entries for AniVerse, a discovery app for anime, shows, K-dramas, movies and documentaries.

House style (match it exactly):
- description: one or two sentences, max 280 characters, spoiler-free hook in your own words.
- synopsis: two short paragraphs, max 900 characters, spoiler-free, in your own words — never copy the source text.
- genreLabels: the 2-4 genres from the allowed list that best describe the title.
- languages: original language first, then major dubs only if the facts mention them.
- highlightTags: 2-4 short factual chips, e.g. "Completed", "2 Seasons", "MAPPA", "English Dub".
- creditLabel: short credit line such as "By MAPPA · Directed by Sunghoo Park", or "" if unclear.
- accent: the palette colour that best matches the title's poster/brand mood.
- status: exactly one of "Airing", "Completed", "Released", "Upcoming".
- ageRating: "7+", "13+", "16+", "17+" or "18+" (TV-14 → 16+, TV-MA/R → 18+, PG-13 → 13+, R-17+ → 17+); "" if unknown.
- sourceMaterial: "Manga", "Light Novel", "Novel", "Webtoon", "Comic", "Video Game" or "Original"; "" if unknown.
- country: full country name, e.g. "Japan", "USA", "South Korea".
- broadcast / airingDay: only while the title is airing (e.g. "Saturdays at 23:00 JST" / "Saturday"); otherwise "".
- type: anime (Japanese animation series), show, kdrama (Korean drama series), movie (incl. anime films), documentary.
- notes: anything the editor should double-check before publishing (conflicting facts, missing data).

Accuracy rules: use only the provided facts plus well-established knowledge about this exact title. If you are not sure, leave the field empty (or null) instead of guessing.`;

export async function searchCatalogSources(query: string): Promise<CatalogCandidate[]> {
  const [anime, tmdb] = await Promise.all([
    searchAnilist(query).catch(() => [] as CatalogCandidate[]),
    isTmdbConfigured() ? searchTmdb(query).catch(() => [] as CatalogCandidate[]) : Promise.resolve([]),
  ]);
  // Interleave so the best hit from each source shows near the top.
  const merged: CatalogCandidate[] = [];
  for (let i = 0; i < Math.max(anime.length, tmdb.length); i++) {
    if (tmdb[i]) merged.push(tmdb[i]!);
    if (anime[i]) merged.push(anime[i]!);
  }
  return merged.slice(0, 12);
}

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function emptyForm(): ContentFormInput {
  return {
    title: "", nativeTitle: "", slug: "", type: "anime", description: "", synopsis: "", imageUrl: "",
    backdropUrl: "", meta: "", trendingLabel: "", creditLabel: "", highlightTags: [], studio: "",
    director: "", originalAuthor: "", sourceMaterial: "", producers: "", network: "", country: "",
    composer: "", status: "", ageRating: "", airedFrom: "", airedTo: "", broadcast: "",
    episodeDuration: "", airingDay: "", seasonLabel: "", lastUpdate: "", languages: [], genreLabels: [],
    seasons: [], episodes: [], characters: [], featuredTrackSlugs: [], relatedContentSlugs: [],
    catalogReviews: [], videoUrl: "", trailerUrl: "",
  } as ContentFormInput;
}

function enrich(facts: Record<string, unknown>, draft: Partial<ContentFormInput>) {
  return generateStructured({
    system: STYLE_GUIDE,
    schema: enrichmentSchema,
    prompt:
      `Facts from the metadata source:\n${JSON.stringify(facts, null, 2)}\n\n` +
      `Fields already filled from those facts (keep consistent with them):\n` +
      JSON.stringify({ title: draft.title, type: draft.type, year: draft.year, studio: draft.studio, meta: draft.meta }, null, 2) +
      `\n\nFill the editorial fields.`,
  });
}

/** Import from TMDB / AniList: facts mapped in code, editorial fields by the model. */
export async function importFromSource(
  candidate: Pick<CatalogCandidate, "source" | "sourceId" | "tmdbKind">,
  report: ProgressReporter = () => {},
): Promise<ContentImportResult> {
  const sourceName = candidate.source === "anilist" ? "AniList" : "TMDB";
  report({ label: `Fetching facts, episodes and cast from ${sourceName}`, percent: 5, ceiling: 22 });
  let source: SourceFacts;
  if (candidate.source === "anilist") source = await fetchAnilistFacts(candidate.sourceId);
  else source = await fetchTmdbFacts(candidate.sourceId, candidate.tmdbKind ?? "movie");

  report({ label: `Drafting the editorial fields with ${activeProviderLabel()}`, percent: 25, ceiling: 92 });
  const ai = await enrich(source.facts, source.draft);
  report({ label: "Assembling the draft", percent: 95, ceiling: 99 });
  const { notes, ...editorial } = ai;
  const draft: ContentFormInput = {
    ...emptyForm(),
    ...source.draft,
    ...editorial,
    // Keep source facts when the model left a factual field blank.
    originalAuthor: editorial.originalAuthor || source.draft.originalAuthor || "",
    country: editorial.country || source.draft.country || "",
  } as ContentFormInput;
  draft.slug = slugify(draft.title);

  const provenance: FieldProvenance = {};
  for (const [key, value] of Object.entries(source.draft)) {
    if (value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)) {
      provenance[key as keyof ContentFormInput] = source.source;
    }
  }
  for (const key of Object.keys(editorial) as (keyof typeof editorial)[]) {
    const value = editorial[key];
    if (value !== "" && !(Array.isArray(value) && value.length === 0)) {
      provenance[key as keyof ContentFormInput] ??= "ai";
    }
  }

  return {
    draft,
    provenance,
    source: source.source,
    sourceUrl: source.sourceUrl,
    webSources: [],
    notes,
    facts: source.facts,
  };
}

/** Fallback when no metadata source has the title: research on the web, then map. */
export async function importFromWeb(
  query: string,
  typeHint?: string,
  report: ProgressReporter = () => {},
): Promise<ContentImportResult> {
  report({ label: `Researching "${query}" on the web with ${activeProviderLabel()}`, percent: 4, ceiling: 50 });
  const research = await researchWithWeb(
    `Research the ${typeHint ? `${typeHint} ` : ""}title "${query}". Write a fact sheet covering: official English and ` +
      `native titles, type, release/air dates, status, number of seasons and episodes (with per-season counts), ` +
      `episode or film runtime, studio/production company, director or creator, music composer, network, country, ` +
      `original language, source material and original author, genres, age rating, IMDb rating, MyAnimeList score ` +
      `if it is anime, main cast/characters (character name, voice actor or actor), and a short spoiler-free plot summary.`,
  );

  report({ label: `Drafting the entry from ${research.sources.length || "the"} web sources`, percent: 55, ceiling: 94 });
  const out = await generateStructured({
    system: `${STYLE_GUIDE}\n\nThe facts below come from web research. Every factual value must come from that fact sheet; anything marked unknown stays empty or null.`,
    schema: webDraftSchema,
    prompt: `Fact sheet:\n${research.factSheet}\n\nFill the catalog entry.`,
  });

  const { notes, seasons, characters, year, rating, imdbRating, malScore, seasonCount, episodeCount, ...strings } = out;
  const isFilm = out.type === "movie" || out.type === "documentary";
  const draft: ContentFormInput = {
    ...emptyForm(),
    ...strings,
    slug: slugify(out.title || query),
    year: year ?? undefined,
    rating: rating ?? undefined,
    imdbRating: imdbRating ?? undefined,
    malScore: malScore ?? undefined,
    seasonCount: isFilm ? undefined : (seasonCount ?? undefined),
    episodeCount: isFilm ? undefined : (episodeCount ?? undefined),
    seasons: isFilm ? [] : seasons.map((s) => ({ label: s.label, episodeCount: s.episodeCount ?? undefined })),
    meta: isFilm ? "Feature Film" : seasonCount ? `${seasonCount} Season${seasonCount === 1 ? "" : "s"}, ${episodeCount ?? "?"} Episodes` : "",
    seasonLabel: isFilm ? "" : (seasons[0]?.label ?? ""),
    characters: characters.map((c) => ({ ...c, imageUrl: "" })),
  } as ContentFormInput;

  const provenance: FieldProvenance = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)) {
      provenance[key as keyof ContentFormInput] = "web";
    }
  }

  return {
    draft,
    provenance,
    source: "web",
    webSources: research.sources,
    notes: [...notes, "Imported from web search — posters and episode lists aren't pulled from the web; add them before publishing."],
    facts: { webFactSheet: research.factSheet },
  };
}
