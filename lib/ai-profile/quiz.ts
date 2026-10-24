import { LANGUAGE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import {
  ARCHETYPES,
  COMMITMENT_OPTIONS,
  DISCOVERY_OPTIONS,
  ENERGY_OPTIONS,
  LISTEN_MOODS,
  PACE_OPTIONS,
  WATCH_AVOID,
  WATCH_FORMATS,
  WATCH_THEMES,
  WATCH_VIBES,
  type VocabOption,
} from "@/lib/ai-profile/vocabulary";
import type { AiMode, ListenPrefs, WatchPrefs } from "@/lib/ai-profile/schema";

/** One animated quiz card. `field` is the answers key it writes. */
export interface QuizQuestion {
  field: string;
  title: string;
  subtitle: string;
  kind: "multi" | "single" | "hours";
  options: readonly VocabOption[];
  /** Max picks for multi questions. */
  max?: number;
  /** Optional questions show "Skip". */
  optional?: boolean;
  /** Archetype cards show the description under the label. */
  showPhrase?: boolean;
}

const LANGUAGES: VocabOption[] = LANGUAGE_OPTIONS.map((o) => ({ id: o.value, label: o.label, emoji: "🗣️", phrase: o.label }));
const SONG_GENRES: VocabOption[] = SONG_GENRE_OPTIONS.map((o) => ({ id: o.value, label: o.label, emoji: "🎵", phrase: o.label }));

export const HOURS_OPTIONS: VocabOption[] = [
  { id: "3", label: "~3 h", emoji: "☕", phrase: "a couple of evenings" },
  { id: "6", label: "~6 h", emoji: "🌙", phrase: "most evenings" },
  { id: "10", label: "~10 h", emoji: "🛋️", phrase: "evenings and a weekend" },
  { id: "20", label: "20 h+", emoji: "🍿", phrase: "binge mode" },
];

export const WATCH_QUIZ: QuizQuestion[] = [
  { field: "formats", title: "What do you feel like watching?", subtitle: "Pick any — or skip for everything", kind: "multi", options: WATCH_FORMATS, max: 5, optional: true },
  { field: "vibes", title: "What's the vibe?", subtitle: "Up to 3 — how you want it to feel", kind: "multi", options: WATCH_VIBES, max: 3 },
  { field: "themes", title: "Which stories pull you in?", subtitle: "Up to 3", kind: "multi", options: WATCH_THEMES, max: 3, optional: true },
  { field: "pace", title: "How do you like it paced?", subtitle: "One pick", kind: "single", options: PACE_OPTIONS, optional: true },
  { field: "commitment", title: "How big a commitment?", subtitle: "We'll size picks to fit", kind: "single", options: COMMITMENT_OPTIONS, optional: true },
  { field: "weeklyHours", title: "How much time do you have each week?", subtitle: "Used to plan a roadmap that actually fits", kind: "hours", options: HOURS_OPTIONS, optional: true },
  { field: "avoid", title: "Anything you'd rather skip?", subtitle: "We'll push these down", kind: "multi", options: WATCH_AVOID, max: 6, optional: true },
  { field: "archetype", title: "Which one sounds most like you?", subtitle: "Your viewer personality", kind: "single", options: ARCHETYPES, optional: true, showPhrase: true },
];

export const LISTEN_QUIZ: QuizQuestion[] = [
  { field: "moods", title: "What are you listening for?", subtitle: "Up to 3 moods or moments", kind: "multi", options: LISTEN_MOODS, max: 3 },
  { field: "genres", title: "Which sounds do you love?", subtitle: "Up to 4", kind: "multi", options: SONG_GENRES, max: 4, optional: true },
  { field: "energy", title: "How much energy?", subtitle: "One pick", kind: "single", options: ENERGY_OPTIONS, optional: true },
  { field: "discovery", title: "How adventurous today?", subtitle: "Familiar or brand new", kind: "single", options: DISCOVERY_OPTIONS, optional: true },
  { field: "languages", title: "Any languages you prefer?", subtitle: "Skip for any", kind: "multi", options: LANGUAGES, max: 4, optional: true },
];

export const quizFor = (mode: AiMode) => (mode === "watch" ? WATCH_QUIZ : LISTEN_QUIZ);

/** Read the quiz's current answer for a question from the prefs object. */
export function answerFor(prefs: WatchPrefs | ListenPrefs, question: QuizQuestion): string[] {
  const value = (prefs as Record<string, unknown>)[question.field];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "number") return [String(value)];
  return typeof value === "string" && value ? [value] : [];
}

/** Write an answer back in the shape the schema expects. */
export function withAnswer<T extends WatchPrefs | ListenPrefs>(prefs: T, question: QuizQuestion, values: string[]): T {
  if (question.kind === "multi") return { ...prefs, [question.field]: values };
  if (question.kind === "hours") return { ...prefs, [question.field]: values[0] ? Number(values[0]) : null };
  return { ...prefs, [question.field]: values[0] ?? "" };
}
