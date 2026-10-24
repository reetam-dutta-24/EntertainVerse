import "server-only";

import {
  issueCollector,
  runAiReview,
  schemaIssues,
  type CatalogReviewResult,
  type ReviewIssue,
} from "@/lib/ai/catalog-review";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import { contentFormSchema, type ContentFormInput } from "@/lib/validators/admin/content";
import { CONTENT_GENRE_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/catalog-enums";

const FIELD_KEYS = Object.keys(contentFormSchema.shape);

const yearIn = (text?: string) => {
  const match = text?.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : undefined;
};

/** Deterministic checks — instant, certain, and free. */
export function checkContentRules(form: ContentFormInput): ReviewIssue[] {
  const { issues, add } = issueCollector();
  schemaIssues(contentFormSchema, form, add);

  const isFilm = form.type === "movie" || form.type === "documentary";
  if (isFilm && (form.seasons.length || form.episodes.length || form.seasonCount)) {
    add("seasons", "error", "Movies and documentaries can't have seasons or episodes — they'll be dropped on save.");
  }
  if (!isFilm) {
    if (form.seasons.length && form.seasonCount && form.seasonCount !== form.seasons.length) {
      add("seasonCount", "warning", `Season count is ${form.seasonCount} but ${form.seasons.length} seasons are listed.`, String(form.seasons.length));
    }
    const listedEpisodes = form.seasons.reduce((sum, s) => sum + (s.episodeCount ?? 0), 0);
    if (listedEpisodes && form.episodeCount && listedEpisodes !== form.episodeCount) {
      add("episodeCount", "warning", `Episode count is ${form.episodeCount} but the seasons add up to ${listedEpisodes}.`, String(listedEpisodes));
    }
    const seen = new Set<string>();
    for (const episode of form.episodes) {
      const key = `${episode.seasonNumber}-${episode.number}`;
      if (seen.has(key)) add("episodes", "error", `Episode S${episode.seasonNumber}E${episode.number} is listed twice.`);
      seen.add(key);
      if (form.seasonCount && episode.seasonNumber > form.seasonCount) {
        add("episodes", "error", `Episode S${episode.seasonNumber}E${episode.number} belongs to a season beyond the season count (${form.seasonCount}).`);
      }
    }
  }

  const fromYear = yearIn(form.airedFrom);
  const toYear = yearIn(form.airedTo);
  if (form.year && fromYear && form.year !== fromYear) {
    add("year", "warning", `Release year ${form.year} doesn't match "Aired from" (${form.airedFrom}).`, String(fromYear));
  }
  if (fromYear && toYear && toYear < fromYear) add("airedTo", "error", `"Aired to" (${form.airedTo}) is before "Aired from" (${form.airedFrom}).`);
  if (form.status === "Airing" && form.airedTo) add("airedTo", "warning", 'Status is "Airing" but an end date is set.');
  if (form.status === "Completed" && !form.airedTo && !isFilm) add("airedTo", "suggestion", 'Status is "Completed" — add the final air date.');
  if ((form.broadcast || form.airingDay) && form.status && form.status !== "Airing") {
    add("broadcast", "suggestion", "Broadcast slot is usually only shown while a title is airing.", "");
  }

  if (!form.imageUrl) add("imageUrl", "warning", "No poster image — cards will fall back to a plain gradient.");
  if (!form.synopsis) add("synopsis", "warning", "Synopsis is empty — the detail page will look bare.");
  if (!form.description) add("description", "suggestion", "Add a short description for cards and search results.");
  if (!form.genreLabels.length) add("genreLabels", "warning", "No genres — this title won't appear in genre shelves or taste matching.");
  if (!form.languages.length) add("languages", "suggestion", "No languages selected — language preferences can't match this title.");
  if (form.rating != null && form.imdbRating != null && Math.abs(form.rating - form.imdbRating) > 2) {
    add("rating", "suggestion", `Catalog rating (${form.rating}) is far from the IMDb rating (${form.imdbRating}). Double-check.`);
  }

  const names = form.characters.map((c) => c.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) add("characters", "warning", "The same character is listed more than once.");
  return issues;
}

/** Episodes can be huge — show the reviewer counts plus a sample. */
function compactForm(form: ContentFormInput) {
  return {
    ...form,
    episodes: {
      total: form.episodes.length,
      sample: form.episodes.slice(0, 6).map((e) => `S${e.seasonNumber}E${e.number} ${e.title} (${e.duration || "?"})`),
    },
    catalogReviews: `${form.catalogReviews.length} editorial reviews`,
  };
}

export async function reviewContentForm(
  form: ContentFormInput,
  options: { facts?: Record<string, unknown>; verifyOnline?: boolean } = {},
  report: ProgressReporter = () => {},
): Promise<CatalogReviewResult> {
  report({ label: "Running automatic consistency checks", percent: 5, ceiling: 10 });
  const ruleIssues = checkContentRules(form);

  return runAiReview(
    {
      subject: "catalog entries",
      fieldKeys: FIELD_KEYS,
      houseRules:
        "House formats: dates like \"Oct 2020\"; durations like \"24 Min\" (episodes) or \"2h 28m\" (films); age ratings like " +
        "\"13+\"/\"16+\"/\"18+\"; status one of Airing/Completed/Released/Upcoming; meta like \"2 Seasons, 47 Episodes\" or \"Feature Film\"; " +
        "ratings on a 0-10 scale.\n" +
        `Allowed genres: ${CONTENT_GENRE_OPTIONS.map((o) => o.value).join(", ")}. Allowed languages: ${LANGUAGE_OPTIONS.map((o) => o.value).join(", ")}.`,
      form: compactForm(form),
      ruleIssues,
      facts: options.facts,
      research:
        options.verifyOnline && form.title.trim()
          ? {
              label: `Verifying "${form.title}" online`,
              instructions:
                `Find authoritative facts for the ${form.type} "${form.title}"${form.year ? ` (${form.year})` : ""} so an editor ` +
                `can verify a catalog entry: release/air dates, status, seasons and episodes, runtime, studio, director/creator, ` +
                `composer, network, country, original language, source material, genres, age rating, IMDb rating` +
                `${form.type === "anime" ? ", MyAnimeList score" : ""}.`,
            }
          : undefined,
    },
    report,
  );
}
