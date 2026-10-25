import type {
  Collection,
  CollectionItem,
  MusicTrack as PrismaMusicTrack,
  User,
} from "@prisma/client";
import { CONTENT_GENRE_OPTIONS, SONG_GENRE_OPTIONS } from "@/lib/catalog-enums";
import { mapContentToItem } from "@/lib/mappers/content.mapper";
import { mapTrackToContentItem } from "@/lib/mappers/music.mapper";
import { formatCardDate, formatRelativeTime } from "@/lib/format-dates";
import { roundRating } from "@/lib/format-rating";
import { formatEngagementCount } from "@/lib/services/content.service";
import type {
  AccentColor,
  Collection as AppCollection,
  CollectionCurrentActivity,
  CollectionDetail,
  Community,
  ContentEngagementStat,
  ContentItem,
  Genre,
  MusicTrack,
  UserSummary,
} from "@/types";

type CollectionWithItems = Collection & {
  user: Pick<User, "id" | "name" | "handle" | "avatarColor" | "avatarUrl">;
  items: (CollectionItem & {
    content: Parameters<typeof mapContentToItem>[0] | null;
    track: PrismaMusicTrack | null;
  })[];
};

function mapVisibility(value: Collection["visibility"]): AppCollection["visibility"] {
  return value === "PUBLIC" ? "public" : "private";
}

type CollectionCardRow = Collection & {
  _count?: { favorites: number; follows?: number };
};

export function mapCollectionToCard(row: CollectionCardRow): AppCollection {
  const favoriteCount = row._count?.favorites ?? row.favoriteCount;
  const followerCount = row._count?.follows ?? row.followerCount ?? 0;
  return {
    id: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category,
    collectionKind: row.kind === "music" ? "music" : "content",
    genreLabelIds: row.genreLabels ?? [],
    itemCount: row.itemCount,
    favoriteCount,
    followerCount,
    visibility: mapVisibility(row.visibility),
    createdAt: formatCardDate(row.createdAt),
    updatedAt: formatRelativeTime(row.updatedAt),
    createdAtTime: row.createdAt.getTime(),
    updatedAtTime: row.updatedAt.getTime(),
    accent: (row.accent as AccentColor) ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
  };
}

export function mapCollectionItemToContent(
  row: CollectionWithItems["items"][number],
  index = 0,
): ContentItem | null {
  if (row.content) {
    const item = mapContentToItem(row.content);
    return {
      ...item,
      matchScore: item.matchScore ?? 80 + (index % 17),
    };
  }
  if (row.track) {
    return {
      ...mapTrackToContentItem(row.track),
      matchScore: 80 + (index % 17),
    };
  }
  return null;
}

function collectGenres(items: ContentItem[]): Genre[] {
  const seen = new Set<string>();
  const genres: Genre[] = [];
  for (const item of items) {
    for (const genre of item.genres ?? []) {
      if (seen.has(genre.id)) continue;
      seen.add(genre.id);
      genres.push(genre);
    }
  }
  return genres.slice(0, 6);
}

function mapStoredGenreLabels(
  labels: string[],
  collectionKind: "content" | "music" = "content",
): Genre[] {
  const options =
    collectionKind === "music" ? SONG_GENRE_OPTIONS : CONTENT_GENRE_OPTIONS;
  return labels
    .map((value) => {
      const option = options.find((entry) => entry.value === value);
      return option
        ? { id: option.value, label: option.label }
        : { id: value, label: value };
    })
    .slice(0, 6);
}

function resolveCollectionGenres(
  items: ContentItem[],
  genreLabels: string[],
  category: string,
  collectionKind: "content" | "music" = "content",
): Genre[] {
  const itemGenres = collectGenres(items);
  if (itemGenres.length > 0) return itemGenres;

  const storedGenres = mapStoredGenreLabels(genreLabels, collectionKind);
  if (storedGenres.length > 0) return storedGenres;

  return [{ id: category.toLowerCase().replace(/\s+/g, "-"), label: category }];
}

function averageRating(items: ContentItem[]): number {
  const ratings = items.map((item) => item.rating).filter((r): r is number => r != null);
  if (ratings.length === 0) return 8.5;
  return roundRating(ratings.reduce((sum, r) => sum + r, 0) / ratings.length) ?? 8.5;
}

function mapOwnerSummary(user: CollectionWithItems["user"]): UserSummary {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}

export function mapCollectionToDetail(
  row: CollectionWithItems,
  options: {
    similarCollections?: AppCollection[];
    similarContent?: ContentItem[];
    similarTracks?: MusicTrack[];
    communities?: Community[];
    continueWatching?: ContentItem[];
    watchedMost?: ContentItem[];
    musicTracks?: MusicTrack[];
    currentActivity?: CollectionCurrentActivity;
  } = {},
): CollectionDetail {
  const allItems = row.items
    .map((item, index) => mapCollectionItemToContent(item, index))
    .filter((item): item is ContentItem => item != null);

  const owner = mapOwnerSummary(row.user);
  const collectionKind = row.kind === "music" ? "music" : "content";
  const genres = resolveCollectionGenres(
    allItems,
    row.genreLabels ?? [],
    row.category ?? "Mixed",
    collectionKind,
  );
  const rating = averageRating(allItems);

  const engagementStats: ContentEngagementStat[] = [
    { id: "items", label: "Items", value: String(row.itemCount) },
    { id: "favorites", label: "Favourites", value: String(row.favoriteCount) },
    {
      id: "followers",
      label: "Followers",
      value: String(row.followerCount ?? 0),
    },
    {
      id: "visibility",
      label: "Visibility",
      value: row.visibility === "PUBLIC" ? "Public" : "Private",
    },
    {
      id: "updated",
      label: "Last Updated",
      value: formatRelativeTime(row.updatedAt),
    },
  ];

  const favoriteItems = collectionKind === "music" ? [] : allItems.slice(0, 4);
  const currentActivity =
    options.currentActivity ??
    (collectionKind === "music"
      ? undefined
      : allItems[0]
        ? {
            title: allItems[0].title,
            statusLabel: `Currently featured in ${row.name}`,
            imageUrl: allItems[0].imageUrl ?? `/images/posters/${allItems[0].id}.jpg`,
            contentId: allItems[0].id,
          }
        : row.imageUrl
          ? {
              title: row.name,
              statusLabel: `Currently featured in ${row.name}`,
              imageUrl: row.imageUrl,
              contentId: row.slug,
            }
          : undefined);

  return {
    id: row.slug,
    name: row.name,
    description: row.description ?? `${row.name} on EntertainVerse.`,
    rating,
    trendingLabel:
      row.visibility === "PUBLIC"
        ? "Trending public collection"
        : "In your private collections",
    genres,
    category: row.category,
    collectionKind,
    genreLabelIds: row.genreLabels ?? [],
    ownerId: owner.id,
    visibility: mapVisibility(row.visibility),
    createdAt: formatCardDate(row.createdAt),
    updatedAt: formatRelativeTime(row.updatedAt),
    itemCount: row.itemCount,
    favoriteCount: row.favoriteCount,
    followerCount: row.followerCount ?? 0,
    matchScore: Math.min(97, Math.round(rating * 10)),
    highlightTags: genres.slice(0, 4).map((genre) => genre.label),
    imageUrl: row.imageUrl ?? allItems[0]?.imageUrl,
    accent: (row.accent as AccentColor) ?? undefined,
    engagementStats,
    contributors: [owner],
    contributorSummary: `${owner.name} curated this collection`,
    favoriteItems,
    currentActivity,
    allItems,
    continueWatching: options.continueWatching ?? [],
    watchedMost: options.watchedMost ?? allItems.slice(0, 6),
    musicTracks: options.musicTracks ?? [],
    similarCollections: options.similarCollections ?? [],
    similarContent: options.similarContent ?? [],
    similarTracks: options.similarTracks ?? [],
    communities: options.communities ?? [],
  };
}

export function formatCollectionEngagement(count: number) {
  return formatEngagementCount(count);
}
