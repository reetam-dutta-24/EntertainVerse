import { mapContentToItem } from "@/lib/mappers/content.mapper";
import { labelForLanguage, labelForSongGenre } from "@/lib/catalog-enums";
import { prisma } from "@/lib/prisma";
import {
  formatTrackDuration,
  getTrackCoverUrl,
  getTrackPreviewUrl,
} from "@/lib/music-preview";
import type {
  CollectionPlayContentItem,
  CollectionPlayQueue,
  CollectionPlayTrack,
} from "@/types";

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

const collectionPlayInclude = {
  user: {
    select: {
      id: true,
      name: true,
      handle: true,
      avatarColor: true,
      avatarUrl: true,
    },
  },
  items: {
    orderBy: { position: "asc" as const },
    include: {
      content: {
        include: {
          genres: { include: { genre: true } },
          episodes: {
            orderBy: [{ seasonNumber: "asc" as const }, { number: "asc" as const }],
            take: 1,
            select: { id: true },
          },
        },
      },
      track: true,
    },
  },
};

export async function getCollectionPlayQueue(
  slug: string,
  viewerUserId?: string,
): Promise<CollectionPlayQueue | null> {
  const row = await prisma.collection.findUnique({
    where: { slug },
    include: collectionPlayInclude,
  });

  if (!row) return null;
  if (row.visibility === "PRIVATE" && row.userId !== viewerUserId) {
    return null;
  }

  const collectionKind = row.kind === "music" ? "music" : "content";

  if (collectionKind === "music") {
    const tracks: CollectionPlayTrack[] = row.items
      .filter((item) => item.track)
      .map((item, index) => {
        const track = item.track!;
        return {
          itemId: item.id,
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
          lyrics: track.lyrics ?? undefined,
          language: track.language ?? undefined,
          rating: track.rating ?? undefined,
          description: track.description ?? undefined,
          genreLabels: mapTrackGenreLabels(track.genres, track.language),
          accent: (track.accent as CollectionPlayTrack["accent"]) ?? undefined,
        };
      });

    return {
      id: row.slug,
      name: row.name,
      description: row.description ?? undefined,
      imageUrl: row.imageUrl ?? tracks[0]?.imageUrl,
      collectionKind,
      itemCount: tracks.length,
      ownerName: row.user.name,
      canManage: Boolean(viewerUserId && row.userId === viewerUserId),
      tracks,
    };
  }

  const items: CollectionPlayContentItem[] = row.items
    .filter((item) => item.content)
    .map((item, index) => {
      const mapped = mapContentToItem(item.content!);
      return {
        itemId: item.id,
        position: index + 1,
        id: mapped.id,
        title: mapped.title,
        type: mapped.type,
        imageUrl: mapped.imageUrl,
        backdropUrl: item.content!.backdropUrl ?? mapped.imageUrl,
        rating: mapped.rating,
        meta: mapped.meta,
        year: mapped.year,
        synopsis:
          item.content!.synopsis ?? item.content!.description ?? undefined,
        description: mapped.description,
        genres: mapped.genres ?? [],
        highlightTags: asStringArray(item.content!.highlightTags),
        accent: mapped.accent,
        defaultEpisodeId: item.content!.episodes[0]?.id,
      };
    });

  return {
    id: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.imageUrl ?? items[0]?.imageUrl,
    collectionKind,
    itemCount: items.length,
    ownerName: row.user.name,
    canManage: Boolean(viewerUserId && row.userId === viewerUserId),
    items,
  };
}
