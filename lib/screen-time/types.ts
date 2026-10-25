/** Client-safe shapes for the daily limit ("Mindful mode"). */

export interface ScreenTimeStatus {
  enabled: boolean;
  limitMinutes: number | null;
  usedMinutes: number;
  remainingMinutes: number | null;
  /** Today's limit is used up — the app stays locked until `unlocksAt`. */
  locked: boolean;
  /** Five minutes or less left. */
  warn: boolean;
  /** Next local midnight (ISO). */
  unlocksAt: string;
  /** Local day key, YYYY-MM-DD — used to show the warning once per day. */
  day: string;
  /** A raise / switch-off waiting for tomorrow. */
  pending: { limitMinutes: number | null; fromDay: string } | null;
  timezone: string;
}

export const LIMIT_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240] as const;
export const WARN_AT_MINUTES = 5;

export function formatLimit(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
