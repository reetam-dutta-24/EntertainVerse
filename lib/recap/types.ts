/** Client-safe shapes for AI "Catch me up" recaps. */

export type RecapDepth = "quick" | "standard" | "detailed";

/** "How much do you remember?" → how deep the recap goes. */
export const MEMORY_OPTIONS: { id: RecapDepth; label: string; emoji: string; hint: string }[] = [
  { id: "detailed", label: "Almost nothing", emoji: "🫥", hint: "Full recap — story, characters, where it stands" },
  { id: "standard", label: "Bits and pieces", emoji: "🤔", hint: "The key beats and who's who" },
  { id: "quick", label: "Most of it", emoji: "😎", hint: "A quick refresher of the last stretch" },
];

export interface RecapOptions {
  title: string;
  kind: "series" | "film";
  /** Series: seasons with episode counts. */
  seasons: { number: number; label: string; episodes: number }[];
  /** Best guess from watch history. */
  guess: { season: number; episode: number } | { percent: number } | null;
  /** Minutes the user has watched (for the "we think you stopped here" note). */
  watchedMinutes: number;
}

export interface RecapResult {
  title: string;
  upToLabel: string;
  headline: string;
  beats: string[];
  characters: { name: string; note: string }[];
  leftOff: string;
  watchFor: string;
  sources: { title: string; url: string }[];
  /** What the recap was grounded in. */
  grounding: "episodes" | "web" | "synopsis";
  cached: boolean;
}
