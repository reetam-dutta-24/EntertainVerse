import { labelForArtistGenre } from "@/lib/catalog-enums";
import { parseListenLinks } from "@/lib/listen-links";
import type { ArtistRecordFull } from "@/lib/services/artist.service";
import type {
  AccentColor,
  ArtistDetail,
  Character,
  ContentEngagementStat,
  Genre,
  MusicTrack,
  Review,
} from "@/types";
import { buildArtistReferenceUrl } from "@/lib/content-reference-url";
import { roundRating } from "@/lib/format-rating";
import { mapTrackToMusicTrack } from "./music.mapper";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapGenres(row: ArtistRecordFull): Genre[] {
  const genreSlugs = asStringArray((row as { genres?: unknown }).genres);
  if (genreSlugs.length > 0) {
    return genreSlugs.map((id) => ({
      id,
      label: labelForArtistGenre(id),
    }));
  }
  return asStringArray(row.primaryTags).map((label, i) => ({
    id: `tag-${i}`,
    label,
  }));
}

function mapMembers(row: ArtistRecordFull): Character[] {
  return row.members.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role ?? "Member",
    imageUrl: m.imageUrl ?? undefined,
  }));
}

function mapTracks(row: ArtistRecordFull): MusicTrack[] {
  return row.tracks.map((t) => mapTrackToMusicTrack(t));
}

function mapReviews(row: ArtistRecordFull): Review[] {
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

export function mapArtistRecordToDetail(row: ArtistRecordFull): ArtistDetail {
  const slug = row.slug;
  const allSongs = mapTracks(row);
  const trendingSongs = row.tracks
    .filter((t) => t.featuredRank != null)
    .sort((a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99))
    .map((t) => mapTrackToMusicTrack(t));
  const fallbackTrending = allSongs.slice(0, 6);
  const albums = allSongs.filter((t) => t.kind === "album");
  const languages = asStringArray(row.languages);
  const primaryTags = asStringArray(row.primaryTags).map((tag) => {
    if (tag === "pop" || tag === "rock" || tag === "kpop") {
      return labelForArtistGenre(tag);
    }
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  });
  if (row.debutYear && !primaryTags.some((t) => t.startsWith("Since"))) {
    primaryTags.push(`Since ${row.debutYear}`);
  }
  if (languages.length > 0 && !primaryTags.some((t) => t.includes(","))) {
    primaryTags.push(languages.join(", "));
  }

  const engagementStats: ContentEngagementStat[] = [
    { id: "songs", label: "Total Songs", value: String(allSongs.length) },
    { id: "albums", label: "Total Albums", value: String(albums.length || Math.ceil(allSongs.length / 8)) },
    { id: "label", label: "Label", value: row.label ?? "—" },
    { id: "debut", label: "Debut", value: row.debutYear ? String(row.debutYear) : "—" },
  ];

  const description = row.synopsis?.trim() || `${row.title} on EntertainVerse.`;

  return {
    id: slug,
    title: row.title,
    nativeTitle: row.nativeTitle ?? undefined,
    rating: roundRating(row.rating) ?? 0,
    rankLeft: row.rankLeft ?? undefined,
    rankRight: row.rankRight ?? undefined,
    genres: mapGenres(row),
    description,
    synopsis: description,
    referenceUrl: buildArtistReferenceUrl(row.title),
    primaryTags,
    metadata: {
      studio: row.label ?? undefined,
      sourceMaterial: row.isGroup ? "Group" : "Solo Artist",
      releaseYear: row.debutYear ?? undefined,
      languages,
      country: undefined,
      status: "Active",
      airedFrom: row.debutYear ? String(row.debutYear) : undefined,
      producers: row.label ?? undefined,
    },
    imageUrl: row.imageUrl ?? poster(slug),
    accent: (row.accent as AccentColor) ?? undefined,
    matchScore: undefined,
    listenLinks: parseListenLinks(row.listenLinks),
    songCount: allSongs.length,
    albumCount: albums.length || Math.ceil(allSongs.length / 8),
    engagementStats,
    members: row.isGroup ? mapMembers(row) : [],
    connections: [],
    trendingSongs: trendingSongs.length > 0 ? trendingSongs : fallbackTrending,
    allSongs,
    mostPlayed: [...allSongs].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 18),
    mostLiked: allSongs.slice(0, 18),
    albums: albums.length > 0 ? albums : allSongs.slice(0, 6),
    similarArtists: [],
    collections: [],
    communities: [],
    reviews: mapReviews(row),
  };
}
