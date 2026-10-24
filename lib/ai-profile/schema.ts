import { z } from "zod";
import { LANGUAGE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import {
  ARCHETYPES,
  COMMITMENT_OPTIONS,
  DISCOVERY_OPTIONS,
  ENERGY_OPTIONS,
  LISTEN_MOODS,
  PACE_OPTIONS,
  VOCAB,
  WATCH_AVOID,
  WATCH_FORMATS,
  WATCH_THEMES,
  WATCH_VIBES,
  vocabIds,
} from "@/lib/ai-profile/vocabulary";

/**
 * What a user told AI mode, per mode. Client-safe: the quiz, the chat
 * extractor and the AI profile page all speak this shape.
 */

const ids = (options: Parameters<typeof vocabIds>[0], max: number) => z.array(z.enum(vocabIds(options))).max(max).default([]);
const optionalId = (options: Parameters<typeof vocabIds>[0]) => z.union([z.enum(vocabIds(options)), z.literal("")]).default("");
const languageIds = LANGUAGE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const songGenreIds = SONG_GENRE_OPTIONS.map((o) => o.value) as [string, ...string[]];

/** Short free-text facts the chat picked up, e.g. "loved Frieren's ending". */
const notesSchema = z.array(z.string().trim().min(1).max(160)).max(8).default([]);

export const watchPrefsSchema = z.object({
  vibes: ids(WATCH_VIBES, 6),
  themes: ids(WATCH_THEMES, 6),
  avoid: ids(WATCH_AVOID, 6),
  formats: ids(WATCH_FORMATS, 5),
  pace: optionalId(PACE_OPTIONS),
  commitment: optionalId(COMMITMENT_OPTIONS),
  languages: z.array(z.enum(languageIds)).max(6).default([]),
  /** Hours a week they can watch — used for time-budgeted roadmaps. */
  weeklyHours: z.number().int().min(1).max(80).nullable().default(null),
  archetype: optionalId(ARCHETYPES),
  notes: notesSchema,
});

export const listenPrefsSchema = z.object({
  moods: ids(LISTEN_MOODS, 6),
  genres: z.array(z.enum(songGenreIds)).max(6).default([]),
  languages: z.array(z.enum(languageIds)).max(6).default([]),
  energy: optionalId(ENERGY_OPTIONS),
  discovery: optionalId(DISCOVERY_OPTIONS),
  notes: notesSchema,
});

export type WatchPrefs = z.infer<typeof watchPrefsSchema>;
export type ListenPrefs = z.infer<typeof listenPrefsSchema>;
export type AiMode = "watch" | "listen";

export const emptyWatchPrefs = (): WatchPrefs => watchPrefsSchema.parse({});
export const emptyListenPrefs = (): ListenPrefs => listenPrefsSchema.parse({});

/** Tolerant read of the JSON column: unknown or invalid values are dropped, not fatal. */
export function parseWatchPrefs(value: unknown): WatchPrefs {
  const parsed = watchPrefsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : emptyWatchPrefs();
}

export function parseListenPrefs(value: unknown): ListenPrefs {
  const parsed = listenPrefsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : emptyListenPrefs();
}

export function hasWatchPrefs(prefs: WatchPrefs) {
  return Boolean(
    prefs.vibes.length || prefs.themes.length || prefs.formats.length || prefs.pace || prefs.commitment || prefs.notes.length,
  );
}

export function hasListenPrefs(prefs: ListenPrefs) {
  return Boolean(prefs.moods.length || prefs.genres.length || prefs.energy || prefs.notes.length);
}

const phrases = (map: Map<string, { phrase: string }>, values: string[]) =>
  values.map((value) => map.get(value)?.phrase).filter(Boolean).join("; ");

/**
 * Natural-language description of the answers — embedded as the user's "taste query".
 * Formats and languages are left out: the taste engine filters on them directly, and
 * in the text they would drown out the vibe.
 */
export function describeWatchPrefs(prefs: WatchPrefs): string {
  return [
    prefs.vibes.length && `Mood: ${phrases(VOCAB.vibes, prefs.vibes)}.`,
    prefs.themes.length && `Themes: ${phrases(VOCAB.themes, prefs.themes)}.`,
    prefs.pace && `Pacing: ${VOCAB.pace.get(prefs.pace)?.phrase}.`,
    prefs.commitment && `Length: ${VOCAB.commitment.get(prefs.commitment)?.phrase}.`,
    prefs.archetype && `Viewer type: ${VOCAB.archetypes.get(prefs.archetype)?.phrase}.`,
    prefs.notes.length && prefs.notes.join(". "),
  ]
    .filter(Boolean)
    .join(" ");
}

export function describeListenPrefs(prefs: ListenPrefs): string {
  return [
    prefs.moods.length && `Listening for: ${phrases(VOCAB.listenMoods, prefs.moods)}.`,
    prefs.energy && `Energy: ${VOCAB.energy.get(prefs.energy)?.phrase}.`,
    prefs.discovery && `Discovery: ${VOCAB.discovery.get(prefs.discovery)?.phrase}.`,
    prefs.notes.length && prefs.notes.join(". "),
  ]
    .filter(Boolean)
    .join(" ");
}
