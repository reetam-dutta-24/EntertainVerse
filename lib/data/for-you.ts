import type { ContentItem, MusicTrack } from "@/types";
import { CacheTags, cached } from "@/lib/cache/server-cache";
import { MOOD_GENRES } from "@/lib/data/onboarding-config";
import { getRelaxingMusic as getRelaxingMusicFromDb } from "@/lib/services/feed.service";
import { getUserById } from "@/lib/services/user.service";
import {
  computeTasteScore,
  genreLabel,
  loadTasteSignals,
  moodLabel,
  pickAnchorTitle,
  rankArtists,
  rankContent,
  rankTracks,
  topGenres,
} from "@/lib/services/taste-engine.service";

/**
 * For You feeds — every shelf is ranked by the taste engine from the user's
 * onboarding answers, favorites, watchlist, and followed artists.
 */

/** Shelves thinner than this read as broken on desktop carousels. */
const MIN_SHELF_ITEMS = 4;

export async function getAiTasteProfileScore(userId?: string): Promise<number> {
  if (!userId) return 0;
  const [user, signals] = await Promise.all([
    getUserById(userId),
    loadTasteSignals(userId),
  ]);
  if (user?.aiTasteScore) return user.aiTasteScore;
  return signals.hasProfile ? computeTasteScore(signals) : 0;
}

export type ForYouShelf =
  | { key: string; kind: "content"; title: string; subtitle: string; items: ContentItem[] }
  | { key: string; kind: "music"; title: string; subtitle: string; tracks: MusicTrack[] };

export interface ForYouFeed {
  hasProfile: boolean;
  shelves: ForYouShelf[];
}

/** The whole feed is ~8 rankings; cached per user and dropped on their writes or catalog changes. */
export async function getForYouFeed(userId: string): Promise<ForYouFeed> {
  return cached(`for-you:${userId}`, { ttl: 120, swr: 600, tags: [CacheTags.user(userId), CacheTags.allUsers, CacheTags.catalog, CacheTags.embeddings] }, () =>
    buildForYouFeed(userId),
  );
}

async function buildForYouFeed(userId: string): Promise<ForYouFeed> {
  const signals = await loadTasteSignals(userId);
  const [recommended, music, artists, anchor, genres, relaxing] = await Promise.all([
    rankContent(signals, { limit: 18, excludeKnown: true }),
    rankTracks(signals, { limit: 18 }),
    rankArtists(signals, { limit: 12 }),
    pickAnchorTitle(signals),
    topGenres(signals, 3),
    getRelaxingMusicFromDb(10),
  ]);

  // Each shelf hides the leading titles of the shelves above it so rows don't
  // repeat each other. Ranking is in-memory, so running these in order is cheap.
  const shownUp = new Set(recommended.slice(0, 8).map((item) => item.id));
  const markShown = (items: ContentItem[]) => {
    items.slice(0, 6).forEach((item) => shownUp.add(item.id));
    return items;
  };
  const mood = signals.selection.moods[0];
  const moodInfo = mood ? moodLabel(mood) : null;

  const becauseYouLoved = anchor
    ? markShown(
        await rankContent(signals, { limit: 12, similarTo: anchor.slug, excludeKnown: true }),
      )
    : [];
  const genreShelves: ContentItem[][] = [];
  for (const genre of genres) {
    let items = await rankContent(signals, { limit: 12, genre, excludeKnown: true, exclude: shownUp });
    // Small genres can be drained by earlier shelves — allow repeats over a near-empty row.
    if (items.length < MIN_SHELF_ITEMS) {
      items = await rankContent(signals, { limit: 12, genre, excludeKnown: true });
    }
    genreShelves.push(markShown(items));
  }
  const moodPicks =
    moodInfo && MOOD_GENRES[mood]
      ? markShown(
          await rankContent(signals, {
            limit: 12,
            anyGenre: MOOD_GENRES[mood],
            excludeKnown: true,
            exclude: shownUp,
          }),
        )
      : [];
  const hiddenGems = await rankContent(signals, {
    limit: 12,
    minRating: 7.5,
    maxRating: 8.6,
    excludeKnown: true,
    exclude: shownUp,
  });

  const shelves: ForYouShelf[] = [
    {
      key: "recommended",
      kind: "content",
      title: "🎯 Recommended for you",
      subtitle: signals.hasProfile
        ? "Ranked from your genres, moods, favorites, and watchlist"
        : "Top-rated picks — take the taste test to personalize this",
      items: recommended,
    },
    {
      key: "music",
      kind: "music",
      title: "🎧 Music matched to your taste",
      subtitle: "Songs and OSTs from the sounds, languages, and artists you love",
      tracks: music,
    },
  ];

  if (anchor && becauseYouLoved.length) {
    shelves.push({
      key: "because",
      kind: "content",
      title: `🎬 Because you love ${anchor.title}`,
      subtitle: "Titles that share its genres and feel",
      items: becauseYouLoved,
    });
  }

  shelves.push({
    key: "artists",
    kind: "content",
    title: "🎤 Artists for you",
    subtitle: "Matched to your music genres and languages",
    items: artists,
  });

  genres.forEach((genre, index) => {
    const items = genreShelves[index];
    if (!items || items.length < MIN_SHELF_ITEMS) return;
    const { label, emoji } = genreLabel(genre);
    shelves.push({
      key: `genre-${genre}`,
      kind: "content",
      title: `${emoji} Top ${label.toLowerCase()} picks`,
      subtitle: `Best-matched ${label.toLowerCase()} titles for your taste`,
      items,
    });
  });

  if (moodInfo && moodPicks.length) {
    shelves.push({
      key: "mood",
      kind: "content",
      title: `${moodInfo.emoji} For your ${moodInfo.label.toLowerCase()} mood`,
      subtitle: "Leaning into the vibe you picked",
      items: moodPicks,
    });
  }

  if (signals.selection.watchHabits.includes("background") || signals.selection.musicTastes.length) {
    shelves.push({
      key: "relaxing",
      kind: "music",
      title: "🌙 Relaxing music for night",
      subtitle: "Calm OSTs and tracks for winding down",
      tracks: relaxing,
    });
  }

  if (hiddenGems.length) {
    shelves.push({
      key: "gems",
      kind: "content",
      title: "✨ Hidden gems",
      subtitle: "Underrated picks your profile says you will love",
      items: hiddenGems,
    });
  }

  return { hasProfile: signals.hasProfile, shelves };
}
