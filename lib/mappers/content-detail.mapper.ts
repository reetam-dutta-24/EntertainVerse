import type { ContentRecordFull } from "@/lib/services/content.service";
import type {
  AccentColor,
  Character,
  ContentDetail,
  ContentEngagementStat,
  ContentItem,
  ContentMetadata,
  ContentSeason,
  Episode,
  MusicTrack,
  Review,
} from "@/types";
import { isMovieContentType } from "@/lib/content-media";
import { buildContentReferenceUrl } from "@/lib/content-reference-url";
import { roundRating } from "@/lib/format-rating";
import {
  formatEngagementCount,
  type getContentEngagementStats,
} from "@/lib/services/content.service";
import { mapGenre, mapContentToItem, prismaMediaTypeToApp } from "./content.mapper";
import { mapTrackToMusicTrack } from "./music.mapper";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function buildHighlightTags(row: ContentRecordFull): string[] {
  const stored = asStringArray(row.highlightTags);
  if (stored.length > 0) return stored;

  const type = prismaMediaTypeToApp(row.type);
  const isMovie = isMovieContentType(type);
  const derived: string[] = [];

  if (!isMovie) {
    if (row.seasons.length > 0) {
      derived.push(`${row.seasons.length} Season${row.seasons.length === 1 ? "" : "s"}`);
    } else if (row.seasonCount != null && row.seasonCount > 0) {
      derived.push(
        `${row.seasonCount} Season${row.seasonCount === 1 ? "" : "s"}`,
      );
    }
    const epCount =
      row.episodes.length > 0
        ? row.episodes.length
        : row.episodeCount ?? 0;
    if (epCount > 0) derived.push(`${epCount} Episodes`);
  } else {
    derived.push("Movie");
  }

  if (row.year) derived.push(String(row.year));
  return derived;
}

function buildMetadata(row: ContentRecordFull): ContentMetadata {
  return {
    studio: row.studio ?? undefined,
    airingDay: row.airingDay ?? undefined,
    languages: asStringArray(row.languages),
    seasonLabel: row.seasonLabel ?? undefined,
    lastUpdate: row.lastUpdate ?? undefined,
    imdbRating: roundRating(row.imdbRating) ?? roundRating(row.rating) ?? undefined,
    malScore: roundRating(row.malScore) ?? undefined,
    ageRating: row.ageRating ?? undefined,
    composer: row.composer ?? undefined,
    director: row.director ?? undefined,
    originalAuthor: row.originalAuthor ?? undefined,
    sourceMaterial: row.sourceMaterial ?? undefined,
    producers: row.producers ?? undefined,
    network: row.network ?? undefined,
    country: row.country ?? undefined,
    status: row.status ?? undefined,
    airedFrom: row.airedFrom ?? undefined,
    airedTo: row.airedTo ?? undefined,
    broadcast: row.broadcast ?? undefined,
    episodeDuration: row.episodeDuration ?? undefined,
    releaseYear: row.year ?? undefined,
  };
}

function buildEngagementStats(
  stats: Awaited<ReturnType<typeof getContentEngagementStats>>,
): ContentEngagementStat[] {
  return [
    { id: "likes", label: "Liked By", value: formatEngagementCount(stats.favorites) },
    { id: "watching", label: "Currently Watching", value: formatEngagementCount(stats.watching) },
    { id: "views", label: "Viewed By", value: formatEngagementCount(stats.views) },
    { id: "collections", label: "Included in Collections", value: formatEngagementCount(stats.collections) },
  ];
}

function mapSeasons(row: ContentRecordFull): ContentSeason[] {
  if (row.seasons.length === 0) return [];
  return row.seasons.map((s, index) => ({
    id: s.id,
    label: s.label,
    episodeCount: s.episodeCount,
    seasonNumber: index + 1,
  }));
}

function mapEpisodes(row: ContentRecordFull): Episode[] {
  return row.episodes.map((e) => ({
    id: e.id,
    seasonNumber: e.seasonNumber,
    number: e.number,
    title: e.title,
    duration: e.duration ?? undefined,
    description: e.description ?? undefined,
    thumbnailUrl: e.thumbnailUrl ?? undefined,
    videoUrl: e.videoUrl ?? undefined,
    releaseDate: e.releaseDate ?? undefined,
    language: e.language ?? undefined,
    rating: roundRating(e.rating) ?? undefined,
  }));
}

function mapCharacters(row: ContentRecordFull): Character[] {
  return row.characters.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role ?? undefined,
    voiceActor: c.voiceActor ?? undefined,
    imageUrl: c.imageUrl ?? undefined,
    accent: (c.accent as AccentColor) ?? undefined,
  }));
}

function mapFeaturedOsts(row: ContentRecordFull): MusicTrack[] {
  return row.featuredTracks.map((f) => mapTrackToMusicTrack(f.track));
}

function mapRelated(row: ContentRecordFull): ContentItem[] {
  return row.relatedFrom.map((r) => mapContentToItem(r.related));
}

function mapCatalogReviews(row: ContentRecordFull): Review[] {
  return row.catalogReviews.map((r) => ({
    id: r.id,
    author: {
      id: `catalog-${r.id}`,
      name: r.authorName,
      avatarColor: r.authorAvatarColor ?? "#ff00cc",
    },
    rating: roundRating(r.rating) ?? 0,
    headline: r.headline ?? undefined,
    content: r.body,
    likeCount: r.likeCount,
    createdAt: r.createdAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    accent: (r.accent as AccentColor) ?? undefined,
  }));
}

const poster = (slug: string) => `/images/posters/${slug}.jpg`;

/** Map a full DB content row to the public detail page shape. */
export function mapContentRecordToDetail(
  row: ContentRecordFull,
  engagement: Awaited<ReturnType<typeof getContentEngagementStats>>,
  fallbackRelated: ContentItem[] = [],
): ContentDetail {
  const slug = row.slug;
  const type = prismaMediaTypeToApp(row.type);
  const description =
    row.description?.trim() ||
    row.synopsis?.trim() ||
    `${row.title} on EntertainVerse.`;
  const related =
    row.relatedFrom.length > 0
      ? mapRelated(row)
      : fallbackRelated.filter((r) => r.id !== slug).slice(0, 8);

  return {
    id: slug,
    title: row.title,
    nativeTitle: row.nativeTitle ?? undefined,
    type: prismaMediaTypeToApp(row.type),
    rating: roundRating(row.rating) ?? 0,
    trendingLabel:
      row.trendingLabel ??
      `Trending on EntertainVerse · ${prismaMediaTypeToApp(row.type).toUpperCase()}`,
    genres: row.genres.map((g) => mapGenre(g.genre)),
    description,
    synopsis: description,
    referenceUrl: buildContentReferenceUrl(type, row.title, row.year),
    highlightTags: buildHighlightTags(row),
    metadata: buildMetadata(row),
    imageUrl: row.imageUrl ?? poster(slug),
    backdropUrl: row.backdropUrl ?? row.imageUrl ?? poster(slug),
    videoUrl: row.videoUrl ?? undefined,
    trailerUrl: row.trailerUrl ?? undefined,
    tmdbId: row.tmdbId ?? undefined,
    tmdbKind: (row.tmdbKind as "movie" | "tv" | null) ?? undefined,
    accent: (row.accent as AccentColor) ?? undefined,
    matchScore: undefined,
    creditLabel: row.creditLabel ?? undefined,
    engagementStats: buildEngagementStats(engagement),
    seasons: mapSeasons(row),
    episodes: mapEpisodes(row),
    characters: mapCharacters(row),
    featuredOsts: mapFeaturedOsts(row),
    relatedContent: related,
    collections: [],
    communities: [],
    reviews: mapCatalogReviews(row),
  };
}

export { mapContentToItem };
