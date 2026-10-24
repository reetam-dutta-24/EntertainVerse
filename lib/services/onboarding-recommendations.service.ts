import "server-only";

import type { Collection, Community } from "@/types";
import { prisma } from "@/lib/prisma";
import { prismaMediaTypeToApp } from "@/lib/mappers/content.mapper";
import { labelForArtistGenre } from "@/lib/catalog-enums";
import {
  GOAL_LINKS,
  onboardingOption,
  type OnboardingCatalog,
  type OnboardingOption,
  type OnboardingRecommendations,
  type OnboardingSelection,
  type TasteBreakdownItem,
} from "@/lib/data/onboarding-config";
import { listDiscoverablePublicCollections } from "@/lib/services/collection.service";
import { listPublicCommunities } from "@/lib/services/community.service";
import {
  loadTasteCatalog,
  pickAnchorTitle,
  rankArtists,
  rankContent,
  rankTracks,
  signalsFromSelection,
} from "@/lib/services/taste-engine.service";

const TYPE_EMOJI: Record<string, string> = {
  anime: "🎌",
  show: "📺",
  movie: "🎬",
  kdrama: "🇰🇷",
  documentary: "🌍",
};

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.toLowerCase());
}

function increment(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}

/** Catalog-backed options for the taste test — only offers what really exists. */
export async function getOnboardingCatalog(): Promise<OnboardingCatalog> {
  const { content, tracks, artists } = await loadTasteCatalog();

  const contentTypeCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};
  const musicGenreCounts: Record<string, number> = {};
  const languageCounts: Record<string, number> = {};

  const titles: OnboardingOption[] = content.map((row) => {
    const type = prismaMediaTypeToApp(row.type);
    const genres = row.genres.map((g) => g.genre.label.toLowerCase());
    const languages = strings(row.languages);
    increment(contentTypeCounts, type);
    genres.forEach((genre) => increment(genreCounts, genre));
    languages.forEach((language) => increment(languageCounts, language));
    return {
      id: row.slug,
      emoji: TYPE_EMOJI[type] ?? "🎞️",
      label: row.title,
      hint: [onboardingOption("contentTypes", type)?.label, row.year].filter(Boolean).join(" · "),
      imageUrl: row.imageUrl ?? `/images/posters/${row.slug}.jpg`,
      tags: [type, ...genres, ...languages],
    };
  });

  for (const track of tracks) {
    const genres = strings(track.genres);
    if (track.kind === "ost" && !genres.includes("ost")) genres.push("ost");
    genres.forEach((genre) => increment(musicGenreCounts, genre));
    if (track.language) increment(languageCounts, track.language.toLowerCase());
  }

  const artistOptions: OnboardingOption[] = artists.map((row) => {
    const genres = [...new Set(strings(row.genres))];
    return {
      id: row.slug,
      emoji: "🎤",
      label: row.title,
      hint: genres.slice(0, 2).map(labelForArtistGenre).join(" · ") || undefined,
      imageUrl: row.imageUrl ?? undefined,
      tags: [...genres, ...strings(row.languages)],
    };
  });

  return {
    contentTypeCounts,
    genreCounts,
    musicGenreCounts,
    languageCounts,
    titles,
    artists: artistOptions,
  };
}

function scoreCommunity(community: Community, selection: OnboardingSelection) {
  const category = community.category.toLowerCase();
  let score = Math.log10(community.memberCount + 10);
  const types = new Set(selection.contentTypes);
  if ((category.includes("anime") || category.includes("manga")) && types.has("anime")) score += 4;
  if (category.includes("show") && (types.has("show") || types.has("kdrama"))) score += 4;
  if (category.includes("movie") && types.has("movie")) score += 4;
  if (category.includes("music") && selection.musicTastes.length > 0) score += 3;
  if (category.includes("music") && selection.goals.includes("music")) score += 2;
  if (selection.goals.includes("communities")) score += 1;
  return score;
}

function scoreCollection(collection: Collection, selection: OnboardingSelection) {
  let score = (collection.favoriteCount ?? 0) / 10;
  if (selection.goals.includes("collections")) score += 2;
  return score;
}

function rankBy<T>(pool: T[], score: (item: T) => number, take: number): T[] {
  return pool
    .map((item) => ({ item, score: score(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((entry) => entry.item);
}

/** Best community per category first, so one category can't take every slot. */
function rankCommunities(pool: Community[], selection: OnboardingSelection, take: number) {
  const ranked = rankBy(pool, (c) => scoreCommunity(c, selection), pool.length);
  const leaders: Community[] = [];
  const rest: Community[] = [];
  const categories = new Set<string>();
  for (const community of ranked) {
    const key = community.category.toLowerCase();
    if (categories.has(key)) rest.push(community);
    else {
      categories.add(key);
      leaders.push(community);
    }
  }
  // Leaders of categories that matched the taste come first, then depth.
  const matched = leaders.filter((c) => scoreCommunity(c, selection) >= 3);
  const others = leaders.filter((c) => !matched.includes(c));
  return [...matched, ...rest, ...others].slice(0, take);
}

function average(values: (number | undefined)[]): number {
  const nums = values.filter((value): value is number => value != null);
  if (!nums.length) return 0;
  return Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function buildSummaryChips(selection: OnboardingSelection): string[] {
  const chip = (step: keyof OnboardingSelection, id: string, withEmoji = true) => {
    const option = onboardingOption(step, id);
    if (!option) return null;
    return withEmoji ? `${option.emoji} ${option.label}` : option.label;
  };

  return [
    ...selection.contentTypes.map((id) => chip("contentTypes", id)),
    ...selection.genres.slice(0, 4).map((id) => chip("genres", id, false)),
    ...selection.moods.map((id) => chip("moods", id)),
    ...selection.musicTastes.slice(0, 3).map((id) => chip("musicTastes", id)),
    ...selection.languages.slice(0, 2).map((id) => chip("languages", id)),
    selection.watchHabits[0] ? chip("watchHabits", selection.watchHabits[0], false) : null,
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 12);
}

function profileDepth(selection: OnboardingSelection): number {
  const answered = [
    selection.contentTypes,
    selection.genres,
    selection.moods,
    selection.favoriteTitles,
    selection.musicTastes,
    selection.languages,
    selection.artists,
    selection.watchHabits,
    selection.goals,
  ].filter((list) => list.length > 0).length;
  const richness = Math.min(1, (selection.favoriteTitles.length + selection.artists.length) / 6);
  return Math.round(40 + (answered / 9) * 45 + richness * 15);
}

/** Preview the matched universe from fresh taste-test answers. */
export async function buildOnboardingRecommendations(
  selection: OnboardingSelection,
  userId: string,
): Promise<OnboardingRecommendations> {
  const signals = signalsFromSelection(selection);
  const picked = new Set(selection.favoriteTitles);

  const [content, tracks, artists, anchor, communities, collections] = await Promise.all([
    rankContent(signals, { limit: 12, exclude: picked }),
    rankTracks(signals, { limit: 10 }),
    rankArtists(signals, { limit: 8 }),
    pickAnchorTitle(signals),
    listPublicCommunities(30),
    listDiscoverablePublicCollections(userId, 15),
  ]);

  const becauseYouLoved = anchor
    ? {
        anchorTitle: anchor.title,
        items: await rankContent(signals, {
          limit: 10,
          similarTo: anchor.slug,
          exclude: picked,
        }),
      }
    : null;

  const tasteBreakdown: TasteBreakdownItem[] = [
    { label: "Watch Match", value: average(content.slice(0, 8).map((item) => item.matchScore)) },
    { label: "Music Match", value: average(tracks.slice(0, 8).map((track) => track.matchScore)) },
    { label: "Artist Match", value: average(artists.slice(0, 5).map((artist) => artist.matchScore)) },
    { label: "Profile Depth", value: profileDepth(selection) },
  ];

  return {
    tasteScore: average(content.slice(0, 10).map((item) => item.matchScore)),
    tasteBreakdown,
    summaryChips: buildSummaryChips(selection),
    content,
    tracks,
    artists,
    communities: rankCommunities(communities, selection, 4),
    collections: rankBy(collections, (c) => scoreCollection(c, selection), 4),
    starterWatchlist: content.slice(0, 4),
    goalLinks: selection.goals.map((goal) => GOAL_LINKS[goal]).filter(Boolean),
    becauseYouLoved: becauseYouLoved?.items.length ? becauseYouLoved : null,
  };
}

/**
 * Turn taste-test picks into real profile data: favorite titles become
 * ContentFavorites and picked artists are followed. Additive only — a retake
 * never removes favorites or follows the user made elsewhere.
 */
export async function applyOnboardingPicks(userId: string, selection: OnboardingSelection) {
  const [contents, artists] = await Promise.all([
    selection.favoriteTitles.length
      ? prisma.content.findMany({
          where: { slug: { in: selection.favoriteTitles } },
          select: { id: true },
        })
      : [],
    selection.artists.length
      ? prisma.artist.findMany({
          where: { slug: { in: selection.artists } },
          select: { id: true },
        })
      : [],
  ]);

  await prisma.$transaction([
    prisma.contentFavorite.createMany({
      data: contents.map((row) => ({ userId, contentId: row.id })),
      skipDuplicates: true,
    }),
    prisma.artistFollow.createMany({
      data: artists.map((row) => ({ userId, artistId: row.id })),
      skipDuplicates: true,
    }),
  ]);
}
