import { labelForLanguage, labelForSongGenre } from "@/lib/catalog-enums";
import { normalizeArtistSlug } from "@/lib/artist-routes";
import { getArtistDetail } from "@/lib/data/artist-detail";
import {
  formatTrackDuration,
  getTrackCoverUrl,
  getTrackPreviewUrl,
} from "@/lib/music-preview";
import { prisma } from "@/lib/prisma";
import type { CollectionPlayQueue, CollectionPlayTrack } from "@/types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapTrackGenreLabels(genres: unknown, language?: string | null) {
  const labels = asStringArray(genres).map((id) => ({
    id,
    label: labelForSongGenre(id),
  }));

  if (
    language &&
    !labels.some((genre) => genre.id === language.toLowerCase())
  ) {
    labels.push({
      id: language.toLowerCase(),
      label: labelForLanguage(language),
    });
  }

  return labels;
}

function mapDbTrack(
  track: {
    slug: string;
    title: string;
    artist: string;
    kind: string;
    source: string | null;
    durationSeconds: number | null;
    durationLabel: string | null;
    imageUrl: string | null;
    backdropUrl: string | null;
    audioUrl: string | null;
    lyrics: string | null;
    language: string | null;
    rating: number | null;
    description: string | null;
    genres: unknown;
    accent: string | null;
  },
  index: number,
): CollectionPlayTrack {
  return {
    itemId: `artist-track-${track.slug}`,
    position: index + 1,
    id: track.slug,
    title: track.title,
    artist: track.artist,
    kind: track.kind,
    source: track.source ?? undefined,
    durationSeconds: track.durationSeconds ?? undefined,
    durationLabel: formatTrackDuration(
      track.durationSeconds,
      track.durationLabel,
    ),
    imageUrl: getTrackCoverUrl(track.slug, track.imageUrl, track.backdropUrl),
    backdropUrl: getTrackCoverUrl(track.slug, track.backdropUrl, track.imageUrl),
    previewUrl: getTrackPreviewUrl(track.slug, track.audioUrl),
    isDemoPreview: !track.audioUrl?.trim(),
    lyrics: track.lyrics ?? undefined,
    language: track.language ?? undefined,
    rating: track.rating ?? undefined,
    description: track.description ?? undefined,
    genreLabels: mapTrackGenreLabels(track.genres, track.language),
    accent: (track.accent as CollectionPlayTrack["accent"]) ?? undefined,
  };
}

export async function getArtistPlayQueue(
  artistId: string,
): Promise<CollectionPlayQueue | null> {
  const slug = normalizeArtistSlug(artistId);
  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      tracks: {
        orderBy: [{ featuredRank: "asc" }, { title: "asc" }],
      },
    },
  });

  if (artist) {
    const tracks = artist.tracks.map((track, index) => mapDbTrack(track, index));

    return {
      id: artist.slug,
      name: artist.title,
      description: artist.synopsis ?? undefined,
      imageUrl: artist.imageUrl ?? tracks[0]?.imageUrl,
      collectionKind: "music",
      itemCount: tracks.length,
      ownerName: artist.title,
      canManage: false,
      tracks,
    };
  }

  const curated = await getArtistDetail(slug);
  if (!curated?.allSongs.length) return null;

  const tracks: CollectionPlayTrack[] = curated.allSongs.map((track, index) => ({
    itemId: `artist-track-${track.id}`,
    position: index + 1,
    id: track.id,
    title: track.title,
    artist: track.artist,
    kind: track.kind,
    source: track.source,
    durationLabel: "—",
    imageUrl: getTrackCoverUrl(track.id, track.imageUrl),
    backdropUrl: getTrackCoverUrl(track.id, track.imageUrl),
    previewUrl: getTrackPreviewUrl(track.id),
    isDemoPreview: true,
    language: track.language,
    rating: track.rating,
    genreLabels: track.language
      ? [{ id: track.language.toLowerCase(), label: track.language }]
      : [],
    accent: curated.accent,
  }));

  return {
    id: curated.id,
    name: curated.title,
    description: curated.synopsis,
    imageUrl: curated.imageUrl ?? tracks[0]?.imageUrl,
    collectionKind: "music",
    itemCount: tracks.length,
    ownerName: curated.title,
    canManage: false,
    tracks,
  };
}
