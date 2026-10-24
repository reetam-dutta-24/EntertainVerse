import "server-only";

import {
  issueCollector,
  runAiReview,
  schemaIssues,
  type CatalogReviewResult,
  type ReviewIssue,
} from "@/lib/ai/catalog-review";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import { ARTIST_GENRE_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/catalog-enums";
import { artistFormSchema, type ArtistFormInput } from "@/lib/validators/admin/artist";

const FIELD_KEYS = Object.keys(artistFormSchema.shape);

/** Deterministic checks — instant, certain, and free. */
export function checkArtistRules(form: ArtistFormInput): ReviewIssue[] {
  const { issues, add } = issueCollector();
  schemaIssues(artistFormSchema, form, add);

  if (form.isGroup && !form.members.length) add("members", "suggestion", "Groups usually list their members.");
  if (!form.isGroup && form.members.length) {
    add("members", "warning", "Members are only saved for groups — tick \"band / group\" or they'll be dropped on save.");
  }
  const names = form.members.map((m) => m.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) add("members", "warning", "The same member is listed more than once.");
  if (form.debutYear && form.debutYear > new Date().getFullYear()) add("debutYear", "warning", `Debut year ${form.debutYear} is in the future.`);

  if (!form.imageUrl) add("imageUrl", "warning", "No artist photo — the hero and cards will fall back to a plain gradient.");
  if (!form.synopsis) add("synopsis", "warning", "Bio is empty — the artist page will look bare.");
  if (!form.genreLabels.length) add("genreLabels", "warning", "No genres — this artist won't appear in genre shelves or taste matching.");
  if (!form.languages.length) add("languages", "suggestion", "No languages selected — language preferences can't match this artist.");
  if (!form.listenLinks.length) add("listenLinks", "suggestion", "No listen links — add Apple Music / Deezer / Spotify profile links.");
  return issues;
}

function compactForm(form: ArtistFormInput) {
  return { ...form, catalogReviews: `${form.catalogReviews.length} editorial reviews` };
}

export async function reviewArtistForm(
  form: ArtistFormInput,
  options: { facts?: Record<string, unknown>; verifyOnline?: boolean } = {},
  report: ProgressReporter = () => {},
): Promise<CatalogReviewResult> {
  report({ label: "Running automatic consistency checks", percent: 5, ceiling: 10 });
  const ruleIssues = checkArtistRules(form);

  return runAiReview(
    {
      subject: "artist profiles",
      fieldKeys: FIELD_KEYS,
      houseRules:
        'House formats: synopsis max 900 characters in two short paragraphs; primaryTags are 2-4 short chips; rankLeft/rankRight like ' +
        '"#10 in Kpop music"; label is the current record label or agency; debutYear is the debut release year; ratings on a 0-10 scale.\n' +
        `Allowed genres: ${ARTIST_GENRE_OPTIONS.map((o) => o.value).join(", ")}. Allowed languages: ${LANGUAGE_OPTIONS.map((o) => o.value).join(", ")}.`,
      form: compactForm(form),
      ruleIssues,
      facts: options.facts,
      research:
        options.verifyOnline && form.title.trim()
          ? {
              label: `Verifying "${form.title}" online`,
              instructions:
                `Find authoritative facts for the music artist "${form.title}" so an editor can verify a profile: solo or group, ` +
                `current members, country, debut year, record label or agency, genres, and languages they sing in.`,
            }
          : undefined,
    },
    report,
  );
}
