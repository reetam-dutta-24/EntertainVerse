import "server-only";

import {
  issueCollector,
  runAiReview,
  schemaIssues,
  type CatalogReviewResult,
  type ReviewIssue,
} from "@/lib/ai/catalog-review";
import { formatDuration } from "@/lib/ai/import-utils";
import type { ProgressReporter } from "@/lib/ai/progress-types";
import { LANGUAGE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import { musicFormSchema, type MusicFormInput } from "@/lib/validators/admin/music";

const FIELD_KEYS = Object.keys(musicFormSchema.shape);

/** Streaming / video pages, not audio files an <audio> element can play. */
const NOT_A_FILE = /(youtube\.com|youtu\.be|spotify\.com|music\.apple\.com|deezer\.com|soundcloud\.com|jiosaavn\.com)/i;

const parseLabel = (label?: string) => {
  const match = label?.trim().match(/^(\d+):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
};

/** Deterministic checks — instant, certain, and free. */
export function checkMusicRules(form: MusicFormInput): ReviewIssue[] {
  const { issues, add } = issueCollector();
  schemaIssues(musicFormSchema, form, add);

  const labelSeconds = parseLabel(form.durationLabel);
  if (form.durationLabel && labelSeconds === undefined) {
    add("durationLabel", "warning", 'Duration should look like "3:45".', form.durationSeconds ? formatDuration(form.durationSeconds) : null);
  }
  if (labelSeconds !== undefined && form.durationSeconds && Math.abs(labelSeconds - form.durationSeconds) > 2) {
    add("durationLabel", "warning", `Duration "${form.durationLabel}" doesn't match ${form.durationSeconds} seconds.`, formatDuration(form.durationSeconds));
  }
  if (form.year && form.year > new Date().getFullYear() + 1) add("year", "warning", `Release year ${form.year} is in the future.`);

  if (form.audioUrl && NOT_A_FILE.test(form.audioUrl)) {
    add("audioUrl", "error", "Audio URL must be a direct audio file you're allowed to stream — put streaming pages under Listen links instead.", "");
  }
  if (form.previewUrl && NOT_A_FILE.test(form.previewUrl)) {
    add("previewUrl", "error", "Preview clip must be a direct audio file (the Apple Music preview .m4a).", "");
  }
  if (!form.audioUrl && !form.previewUrl) {
    add("previewUrl", "suggestion", "No playable audio — the player falls back to a demo track. Import from Apple Music to attach the official 30s preview.");
  }
  if (!form.listenLinks.length) add("listenLinks", "suggestion", "No listen links — add Apple Music / Deezer / Spotify links so listeners can hear the full song.");
  if (form.lyrics?.trim()) {
    add("lyrics", "warning", "Lyrics are copyrighted — only publish them if you're licensed to display them.");
  }

  if (form.kind === "ost" && !form.source) add("source", "suggestion", "OSTs should name the show or film they're from.");
  if (!form.imageUrl) add("imageUrl", "warning", "No cover image — cards will fall back to a plain gradient.");
  if (!form.description) add("description", "suggestion", "Add a short description for cards and the song page.");
  if (!form.genreLabels.length) add("genreLabels", "warning", "No genres — this song won't appear in genre shelves or taste matching.");
  if (!form.language) add("language", "suggestion", "No language — language preferences can't match this song.");
  return issues;
}

/** Lyrics can be long and the model must never rewrite them — send a summary. */
function compactForm(form: MusicFormInput) {
  return {
    ...form,
    lyrics: form.lyrics?.trim() ? `${form.lyrics.split("\n").length} lines (not shown)` : "",
    catalogReviews: `${form.catalogReviews.length} editorial reviews`,
  };
}

export async function reviewMusicForm(
  form: MusicFormInput,
  options: { facts?: Record<string, unknown>; verifyOnline?: boolean } = {},
  report: ProgressReporter = () => {},
): Promise<CatalogReviewResult> {
  report({ label: "Running automatic consistency checks", percent: 5, ceiling: 10 });
  const ruleIssues = checkMusicRules(form);

  return runAiReview(
    {
      subject: "song entries",
      fieldKeys: FIELD_KEYS.filter((key) => key !== "lyrics"),
      houseRules:
        'House formats: durationLabel like "3:45" matching durationSeconds; kind one of song/ost/album; ratings on a 0-10 scale; ' +
        'source for OSTs like "Oshi no Ko — Opening 1"; description max 280 characters.\n' +
        `Allowed genres: ${SONG_GENRE_OPTIONS.map((o) => o.value).join(", ")}. Allowed languages: ${LANGUAGE_OPTIONS.map((o) => o.value).join(", ")}.\n` +
        "Never suggest lyrics text.",
      form: compactForm(form),
      ruleIssues,
      facts: options.facts,
      research:
        options.verifyOnline && form.title.trim()
          ? {
              label: `Verifying "${form.title}" online`,
              instructions:
                `Find authoritative facts for the song "${form.title}"${form.artist ? ` by ${form.artist}` : ""} so an editor can ` +
                `verify a catalog entry: release date, album, duration, sung language, genres, composer/lyricist, and whether ` +
                `it is an anime/show theme (which title, opening or ending). Do not include lyrics.`,
            }
          : undefined,
    },
    report,
  );
}
