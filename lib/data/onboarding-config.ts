import type { Collection, Community, ContentItem, MusicTrack } from "@/types";
import {
  CONTENT_GENRE_OPTIONS,
  LANGUAGE_OPTIONS,
  SONG_GENRE_OPTIONS,
} from "@/lib/catalog-enums";

/**
 * Client-safe onboarding config — no database imports.
 * Catalog-backed options (titles, artists, counts) are loaded on the server
 * by onboarding-catalog.service.ts and turned into steps with buildOnboardingSteps().
 */

export interface OnboardingOption {
  id: string;
  emoji: string;
  label: string;
  hint?: string;
  /** Poster / artist photo for visual pick steps. */
  imageUrl?: string;
  /** Matching keys (type, genres, languages) used to sort picks by relevance. */
  tags?: string[];
}

export interface OnboardingSelection {
  contentTypes: string[];
  genres: string[];
  moods: string[];
  favoriteTitles: string[];
  /** Music genre ids from SONG_GENRE_OPTIONS (e.g. "kpop", "rock", "ost"). */
  musicTastes: string[];
  /** Catalog language ids — applies to both shows and music. */
  languages: string[];
  artists: string[];
  watchHabits: string[];
  goals: string[];
}

export type OnboardingStepKind = "chips" | "posters" | "artists";
export type OnboardingStepSection = "watch" | "listen" | "you";

export interface OnboardingStepConfig {
  id: keyof OnboardingSelection;
  section: OnboardingStepSection;
  kind: OnboardingStepKind;
  title: string;
  subtitle: string;
  /** Extra line under the grid, e.g. what happens with the picks. */
  note?: string;
  options: OnboardingOption[];
  min: number;
  max?: number;
}

/** What the catalog actually has — so onboarding never offers empty options. */
export interface OnboardingCatalog {
  contentTypeCounts: Record<string, number>;
  genreCounts: Record<string, number>;
  musicGenreCounts: Record<string, number>;
  languageCounts: Record<string, number>;
  titles: OnboardingOption[];
  artists: OnboardingOption[];
}

export interface TasteBreakdownItem {
  label: string;
  value: number;
}

export interface OnboardingGoalLink {
  id: string;
  emoji: string;
  label: string;
  href: string;
}

export interface OnboardingRecommendations {
  tasteScore: number;
  tasteBreakdown: TasteBreakdownItem[];
  summaryChips: string[];
  content: ContentItem[];
  tracks: MusicTrack[];
  communities: Community[];
  collections: Collection[];
  artists: ContentItem[];
  starterWatchlist: ContentItem[];
  goalLinks: OnboardingGoalLink[];
  /** "Because you love X" row built from a picked favorite. */
  becauseYouLoved?: { anchorTitle: string; items: ContentItem[] } | null;
}

export const SECTION_LABELS: Record<OnboardingStepSection, string> = {
  watch: "Watch",
  listen: "Listen",
  you: "You",
};

export const CONTENT_TYPE_OPTIONS: OnboardingOption[] = [
  { id: "anime", emoji: "🎌", label: "Anime" },
  { id: "show", emoji: "📺", label: "Shows" },
  { id: "movie", emoji: "🎬", label: "Movies" },
  { id: "kdrama", emoji: "🇰🇷", label: "K-Dramas" },
  { id: "documentary", emoji: "🌍", label: "Documentaries" },
];

const GENRE_EMOJI: Record<string, string> = {
  action: "⚔️",
  adventure: "🧭",
  comedy: "😂",
  crime: "🚔",
  drama: "🎭",
  fantasy: "🐉",
  horror: "👻",
  mystery: "🔎",
  romance: "💘",
  "sci-fi": "🚀",
  thriller: "🕵️",
  sports: "🏐",
  supernatural: "🔮",
  "slice-of-life": "🌸",
  psychological: "🧠",
};

export const GENRE_OPTIONS: OnboardingOption[] = CONTENT_GENRE_OPTIONS.map((g) => ({
  id: g.value,
  emoji: GENRE_EMOJI[g.value] ?? "🎞️",
  label: g.label,
}));

/** Moods map onto real catalog genres — the feed boosts these. */
export const MOOD_GENRES: Record<string, string[]> = {
  intense: ["action", "thriller"],
  emotional: ["drama", "romance"],
  cozy: ["comedy", "slice-of-life", "romance"],
  lighthearted: ["comedy", "adventure"],
  mysterious: ["mystery", "crime", "psychological"],
  "mind-bending": ["sci-fi", "psychological", "supernatural"],
  epic: ["adventure", "fantasy", "action"],
  dark: ["horror", "thriller", "crime"],
};

export const MOOD_OPTIONS: OnboardingOption[] = [
  { id: "intense", emoji: "⚡", label: "Intense", hint: "Action & thrillers" },
  { id: "emotional", emoji: "💧", label: "Emotional", hint: "Drama & heartfelt" },
  { id: "cozy", emoji: "🍵", label: "Cozy", hint: "Warm & comforting" },
  { id: "lighthearted", emoji: "😄", label: "Lighthearted", hint: "Fun & breezy" },
  { id: "mysterious", emoji: "🌙", label: "Mysterious", hint: "Whodunits & twists" },
  { id: "mind-bending", emoji: "🌀", label: "Mind-Bending", hint: "Sci-fi & psychological" },
  { id: "epic", emoji: "🏔️", label: "Epic", hint: "Big worlds & quests" },
  { id: "dark", emoji: "🖤", label: "Dark & Gritty", hint: "Crime & suspense" },
];

const MUSIC_GENRE_EMOJI: Record<string, string> = {
  jpop: "🇯🇵",
  kpop: "🇰🇷",
  pop: "🎤",
  rock: "🎸",
  "hip-hop": "🧢",
  rap: "🎙️",
  rnb: "💜",
  electronic: "🎛️",
  ost: "🎼",
  indie: "🌿",
  ballad: "🕯️",
  metal: "🤘",
  jazz: "🎷",
};

/** "english" is a language, not a sound — the languages step covers it. */
export const MUSIC_GENRE_OPTIONS: OnboardingOption[] = SONG_GENRE_OPTIONS.filter(
  (g) => g.value !== "english",
).map((g) => ({
  id: g.value,
  emoji: MUSIC_GENRE_EMOJI[g.value] ?? "🎵",
  label: g.label,
}));

const LANGUAGE_EMOJI: Record<string, string> = {
  japanese: "🇯🇵",
  english: "🇬🇧",
  korean: "🇰🇷",
  chinese: "🇨🇳",
  hindi: "🇮🇳",
  spanish: "🇪🇸",
  french: "🇫🇷",
  german: "🇩🇪",
  portuguese: "🇵🇹",
  italian: "🇮🇹",
};

export const LANGUAGE_PICK_OPTIONS: OnboardingOption[] = LANGUAGE_OPTIONS.map((l) => ({
  id: l.value,
  emoji: LANGUAGE_EMOJI[l.value] ?? "🌐",
  label: l.label,
}));

export const WATCH_HABIT_OPTIONS: OnboardingOption[] = [
  { id: "binge", emoji: "🍿", label: "Binge Sessions", hint: "Whole seasons at once" },
  { id: "weekly", emoji: "📅", label: "Weekly Drops", hint: "Follow as it airs" },
  { id: "casual", emoji: "☕", label: "Casual Viewer", hint: "An episode here & there" },
  { id: "background", emoji: "🎧", label: "Music-First", hint: "Mostly here to listen" },
];

export const GOAL_OPTIONS: OnboardingOption[] = [
  { id: "recommendations", emoji: "🎯", label: "Smart Recommendations", hint: "AI-matched picks" },
  { id: "music", emoji: "🎧", label: "Music & Lyrics", hint: "Synced lyrics & OSTs" },
  { id: "communities", emoji: "👥", label: "Fandom Communities", hint: "Chat, voice & watch parties" },
  { id: "collections", emoji: "📒", label: "Collections", hint: "Curate & collaborate" },
  { id: "watchlist", emoji: "📋", label: "Watchlist Tracking", hint: "Never lose your place" },
  { id: "friends", emoji: "💬", label: "Friends & DMs", hint: "Follow, chat & share" },
  { id: "analytics", emoji: "📊", label: "Taste Analytics", hint: "See your patterns" },
];

export const GOAL_LINKS: Record<string, OnboardingGoalLink> = {
  recommendations: { id: "for-you", emoji: "🎯", label: "Explore For You", href: "/dashboard/for-you" },
  music: { id: "discover", emoji: "🎧", label: "Discover Music", href: "/dashboard/discover" },
  communities: { id: "community", emoji: "👥", label: "Browse Communities", href: "/dashboard/community" },
  collections: { id: "collections", emoji: "📒", label: "View Collections", href: "/dashboard/collections" },
  watchlist: { id: "watchlist", emoji: "📋", label: "Open Watchlist", href: "/dashboard/watchlist" },
  friends: { id: "messages", emoji: "💬", label: "Find Friends", href: "/dashboard/messages" },
  analytics: { id: "analytics", emoji: "📊", label: "Open Analytics", href: "/dashboard/analytics" },
};

const STATIC_OPTIONS: Partial<Record<keyof OnboardingSelection, OnboardingOption[]>> = {
  contentTypes: CONTENT_TYPE_OPTIONS,
  genres: GENRE_OPTIONS,
  moods: MOOD_OPTIONS,
  musicTastes: MUSIC_GENRE_OPTIONS,
  languages: LANGUAGE_PICK_OPTIONS,
  watchHabits: WATCH_HABIT_OPTIONS,
  goals: GOAL_OPTIONS,
};

/** Label lookup for fixed option sets (dashboard chips, summaries). */
export function onboardingOption(
  stepId: keyof OnboardingSelection,
  optionId: string,
): OnboardingOption | undefined {
  return STATIC_OPTIONS[stepId]?.find((option) => option.id === optionId);
}

function countHint(count: number | undefined, noun: string): string | undefined {
  if (!count) return undefined;
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function withCounts(
  options: OnboardingOption[],
  counts: Record<string, number>,
  noun: string,
): OnboardingOption[] {
  return options
    .filter((option) => (counts[option.id] ?? 0) > 0)
    .map((option) => ({ ...option, hint: countHint(counts[option.id], noun) }));
}

/** Build the taste-test steps from what the catalog actually contains. */
export function buildOnboardingSteps(catalog: OnboardingCatalog): OnboardingStepConfig[] {
  const steps: OnboardingStepConfig[] = [
    {
      id: "contentTypes",
      section: "watch",
      kind: "chips",
      title: "🎬 What do you love watching?",
      subtitle: "Pick everything you're into — we'll tune your universe around it.",
      min: 1,
      options: withCounts(CONTENT_TYPE_OPTIONS, catalog.contentTypeCounts, "title"),
    },
    {
      id: "genres",
      section: "watch",
      kind: "chips",
      title: "🎭 Pick your favorite genres",
      subtitle: "Choose 3 to 6 — these weigh the most in your matches.",
      min: 3,
      max: 6,
      options: withCounts(GENRE_OPTIONS, catalog.genreCounts, "title"),
    },
    {
      id: "moods",
      section: "watch",
      kind: "chips",
      title: "🌗 What vibe do you usually go for?",
      subtitle: "Pick up to 3 — we'll lean your feed toward these moods.",
      min: 1,
      max: 3,
      options: MOOD_OPTIONS,
    },
    {
      id: "favoriteTitles",
      section: "watch",
      kind: "posters",
      title: "❤️ Anything you already love?",
      subtitle: "Pick up to 6 — we'll find more like these first.",
      note: "Your picks are added to your favorites and shown on your profile.",
      min: 0,
      max: 6,
      options: catalog.titles,
    },
    {
      id: "musicTastes",
      section: "listen",
      kind: "chips",
      title: "🎵 What's on your playlist?",
      subtitle: "Pick up to 5 sounds — songs, OSTs, and artists follow your taste.",
      min: 1,
      max: 5,
      options: withCounts(MUSIC_GENRE_OPTIONS, catalog.musicGenreCounts, "track"),
    },
    {
      id: "languages",
      section: "listen",
      kind: "chips",
      title: "🌐 Which languages do you enjoy?",
      subtitle: "Optional — for both shows and music. Skip if you're open to anything.",
      min: 0,
      max: 4,
      options: withCounts(LANGUAGE_PICK_OPTIONS, catalog.languageCounts, "pick"),
    },
    {
      id: "artists",
      section: "listen",
      kind: "artists",
      title: "🎤 Artists you're into",
      subtitle: "Pick up to 6 — sorted by the sounds you just chose.",
      note: "We'll follow these artists for you so their drops show up first.",
      min: 0,
      max: 6,
      options: catalog.artists,
    },
    {
      id: "watchHabits",
      section: "you",
      kind: "chips",
      title: "⏱️ How do you usually watch?",
      subtitle: "Pick one — we'll pace recommendations for your style.",
      min: 1,
      max: 1,
      options: WATCH_HABIT_OPTIONS,
    },
    {
      id: "goals",
      section: "you",
      kind: "chips",
      title: "🚀 What brings you to AniVerse?",
      subtitle: "Pick up to 4 — we'll surface those features first.",
      min: 1,
      max: 4,
      options: GOAL_OPTIONS,
    },
  ];

  // Drop steps the catalog can't support (e.g. no artists seeded yet).
  return steps.filter((step) => step.options.length > 0);
}

export const emptyOnboardingSelection: OnboardingSelection = {
  contentTypes: [],
  genres: [],
  moods: [],
  favoriteTitles: [],
  musicTastes: [],
  languages: [],
  artists: [],
  watchHabits: [],
  goals: [],
};

/** Older taste tests stored labels ("Movies", "J-Pop") instead of ids. */
const LEGACY_IDS: Record<string, string> = {
  movies: "movie",
  shows: "show",
  "k-dramas": "kdrama",
  documentaries: "documentary",
  "j-pop": "jpop",
  "k-pop": "kpop",
  "anime osts": "ost",
  "anime ost": "ost",
  "sci fi": "sci-fi",
  "slice of life": "slice-of-life",
  "hip hop": "hip-hop",
  "r&b": "rnb",
};

function toIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => {
      const key = item.trim().toLowerCase();
      return LEGACY_IDS[key] ?? key;
    })
    .filter(Boolean);
  return [...new Set(ids)];
}

/** Parse saved / posted selections, tolerating legacy shapes and missing keys. */
export function normalizeOnboardingSelection(value: unknown): OnboardingSelection {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const musicTastes = toIds(row.musicTastes);
  const languages = toIds(row.languages);

  // Old "English Pop" music pick → English language preference.
  if (musicTastes.includes("english") && !languages.includes("english")) {
    languages.push("english");
  }

  return {
    contentTypes: toIds(row.contentTypes),
    genres: toIds(row.genres),
    moods: toIds(row.moods),
    favoriteTitles: toIds(row.favoriteTitles),
    musicTastes: musicTastes.filter((id) => id !== "english" && id !== "albums"),
    languages,
    artists: toIds(row.artists),
    watchHabits: toIds(row.watchHabits),
    goals: toIds(row.goals),
  };
}
