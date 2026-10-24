/**
 * Runtime estimates for roadmap steps, from catalog data:
 * "24 Min" per episode, "2h 16m" for films, episode / season counts for series.
 */

const DEFAULT_EPISODE_MINUTES: Record<string, number> = {
  ANIME: 24,
  SHOW: 45,
  KDRAMA: 65,
  DOCUMENTARY: 50,
};

/** "24 Min" → 24, "2h 16m" → 136, "6h" → 360, "" → null. */
export function parseDuration(text?: string | null): number | null {
  if (!text) return null;
  const hours = text.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minutes = text.match(/(\d+)\s*m(?:in)?/i);
  const total = (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  return total > 0 ? Math.round(total) : null;
}

interface RuntimeInput {
  type: string;
  episodeDuration?: string | null;
  episodeCount?: number | null;
  seasonCount?: number | null;
}

export function isFilmType(type: string) {
  return type === "MOVIE";
}

/** Minutes per episode — a duration over 90 min on a series is a total runtime, not per episode. */
export function episodeMinutes(row: RuntimeInput) {
  const parsed = parseDuration(row.episodeDuration);
  const episodes = Math.max(1, row.episodeCount ?? 1);
  if (parsed && parsed > 90 && episodes > 1) return Math.max(10, Math.round(parsed / episodes));
  return parsed ?? DEFAULT_EPISODE_MINUTES[row.type] ?? 40;
}

/** Whole title: a film's runtime, or every episode of a series. */
export function fullRuntime(row: RuntimeInput) {
  if (isFilmType(row.type)) return parseDuration(row.episodeDuration) ?? 120;
  return episodeMinutes(row) * Math.max(1, row.episodeCount ?? 1);
}

/** Schedule steps into weeks of `weeklyMinutes` (a long step can span weeks; the next starts where it ends). */
export function scheduleWeeks(minutes: number[], weeklyMinutes: number) {
  let elapsed = 0;
  return minutes.map((value) => {
    const week = Math.floor(elapsed / weeklyMinutes) + 1;
    elapsed += value;
    return week;
  });
}
