/** Client-safe shapes for Taste DNA history and AniVerse Wrapped. */

export interface DnaTrait {
  id: string;
  label: string;
  emoji: string;
}

export interface DnaMonth {
  /** e.g. "Mar" */
  month: string;
  /** e.g. "2026-03" */
  key: string;
  /** Minutes of activity behind this month's reading (0 = no data). */
  minutes: number;
  /** traitId → 0–100, only for months with activity. */
  scores: Record<string, number>;
  /** The trait that stood out most this month (vs your usual). */
  standout: DnaTrait | null;
}

export interface DnaEra {
  trait: DnaTrait;
  /** "Mar" / "Mar–May" */
  label: string;
  months: number;
}

export interface TasteDnaHistory {
  months: DnaMonth[];
  /** The traits plotted as strands (your strongest overall). */
  strands: DnaTrait[];
  eras: DnaEra[];
  /** Biggest rise / fall between the first and second half of your active months. */
  rising: { trait: DnaTrait; delta: number } | null;
  fading: { trait: DnaTrait; delta: number } | null;
  activeMonths: number;
}

export interface WrappedItem {
  slug: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  minutes: number;
}

export interface WrappedData {
  year: number;
  /** True when there isn't enough activity for a real Wrapped yet. */
  empty: boolean;
  userName: string;
  totals: {
    watchMinutes: number;
    listenMinutes: number;
    titles: number;
    tracks: number;
    activeDays: number;
    favoritesAdded: number;
    reviews: number;
    posts: number;
    messages: number;
  };
  topTitles: WrappedItem[];
  topTracks: WrappedItem[];
  topArtists: WrappedItem[];
  topGenres: { label: string; share: number }[];
  /** e.g. { label: "Anime", share: 62 } */
  topFormat: { label: string; share: number } | null;
  vibes: DnaTrait[];
  moods: DnaTrait[];
  eras: DnaEra[];
  biggestDay: { label: string; minutes: number } | null;
  /** e.g. "🌙 Night owl" */
  timeOfDay: { label: string; emoji: string; share: number } | null;
  longestStreak: number;
  /** "Top 5%" of AniVerse users by time spent, when there are enough users to compare. */
  topPercent: number | null;
  persona: { name: string; tagline: string; intro: string };
}
