import { z } from "zod";
import { LANGUAGE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import {
  ARCHETYPES,
  COMMITMENT_OPTIONS,
  COMPANY_OPTIONS,
  DISCOVERY_OPTIONS,
  ENDING_OPTIONS,
  ENERGY_OPTIONS,
  ERA_OPTIONS,
  INTENSITY_OPTIONS,
  LISTEN_MOODS,
  PACE_OPTIONS,
  PROTAGONISTS,
  SUBS_DUBS_OPTIONS,
  VOCAB,
  VOCALS_OPTIONS,
  WATCH_AVOID,
  WATCH_FORMATS,
  WATCH_OCCASIONS,
  WATCH_THEMES,
  WATCH_VIBES,
  WATCH_WORLDS,
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

/** Catalog slugs picked on "what did you love?" cards — strong anchors for the recommender. */
const slugsSchema = z.array(z.string().trim().min(1).max(120)).max(5).default([]);

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
  /** Titles they loved (catalog slugs). */
  lovedTitles: slugsSchema,
  worlds: ids(WATCH_WORLDS, 3),
  protagonists: ids(PROTAGONISTS, 3),
  ending: optionalId(ENDING_OPTIONS),
  intensity: optionalId(INTENSITY_OPTIONS),
  occasions: ids(WATCH_OCCASIONS, 3),
  company: optionalId(COMPANY_OPTIONS),
  subsDubs: optionalId(SUBS_DUBS_OPTIONS),
  notes: notesSchema,
});

export const listenPrefsSchema = z.object({
  moods: ids(LISTEN_MOODS, 6),
  genres: z.array(z.enum(songGenreIds)).max(6).default([]),
  languages: z.array(z.enum(languageIds)).max(6).default([]),
  energy: optionalId(ENERGY_OPTIONS),
  discovery: optionalId(DISCOVERY_OPTIONS),
  /** Artists they love (catalog slugs). */
  lovedArtists: slugsSchema,
  vocals: optionalId(VOCALS_OPTIONS),
  eras: ids(ERA_OPTIONS, 3),
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
    prefs.vibes.length ||
      prefs.themes.length ||
      prefs.formats.length ||
      prefs.pace ||
      prefs.commitment ||
      prefs.notes.length ||
      prefs.lovedTitles.length ||
      prefs.worlds.length ||
      prefs.protagonists.length ||
      prefs.ending ||
      prefs.intensity,
  );
}

export function hasListenPrefs(prefs: ListenPrefs) {
  return Boolean(
    prefs.moods.length || prefs.genres.length || prefs.energy || prefs.notes.length || prefs.lovedArtists.length || prefs.vocals,
  );
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
    prefs.worlds.length && `Worlds: ${phrases(VOCAB.worlds, prefs.worlds)}.`,
    prefs.protagonists.length && `Main character: ${phrases(VOCAB.protagonists, prefs.protagonists)}.`,
    prefs.ending && `Endings: ${VOCAB.ending.get(prefs.ending)?.phrase}.`,
    prefs.intensity && `Intensity: ${VOCAB.intensity.get(prefs.intensity)?.phrase}.`,
    prefs.occasions.length && `Usually watches: ${phrases(VOCAB.occasions, prefs.occasions)}.`,
    prefs.company && `Watching: ${VOCAB.company.get(prefs.company)?.phrase}.`,
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
    prefs.vocals && `Vocals: ${VOCAB.vocals.get(prefs.vocals)?.phrase}.`,
    prefs.eras.length && `Era: ${phrases(VOCAB.era, prefs.eras)}.`,
    prefs.notes.length && prefs.notes.join(". "),
  ]
    .filter(Boolean)
    .join(" ");
}
