import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appMediaTypeToPrisma,
  mapContentToItem,
  prismaMediaTypeToApp,
} from "@/lib/mappers/content.mapper";
import type { ContentFormInput } from "@/lib/validators/admin/content";
import { roundRating } from "@/lib/format-rating";
import type { ContentItem, MediaType } from "@/types";

const contentInclude = {
  genres: { include: { genre: true } },
  seasons: { orderBy: { position: "asc" as const } },
  episodes: { orderBy: { position: "asc" as const } },
  characters: { orderBy: { position: "asc" as const } },
  featuredTracks: {
    orderBy: { position: "asc" as const },
    include: { track: true },
  },
  relatedFrom: {
    orderBy: { position: "asc" as const },
    include: { related: { include: { genres: { include: { genre: true } } } } },
  },
  catalogReviews: { orderBy: { position: "asc" as const } },
} satisfies Prisma.ContentInclude;

export type ContentRecordFull = Prisma.ContentGetPayload<{
  include: typeof contentInclude;
}>;

function emptyToNull(value: string | undefined) {
  if (value == null || value === "") return null;
  return value;
}

/** Genre enum slugs are stored as the canonical `label` for consistent chip styling. */
async function upsertGenreLabels(enumSlugs: string[]) {
  const unique = [...new Set(enumSlugs.map((l) => l.trim()).filter(Boolean))];
  const genres = await Promise.all(
    unique.map((slug) =>
      prisma.genre.upsert({
        where: { label: slug },
        create: { label: slug },
        update: {},
      }),
    ),
  );
  return genres;
}

function toContentData(input: ContentFormInput): Prisma.ContentCreateInput {
  return {
    title: input.title,
    slug: input.slug,
    nativeTitle: emptyToNull(input.nativeTitle),
    type: appMediaTypeToPrisma(input.type),
    description: emptyToNull(input.description),
    synopsis: emptyToNull(input.synopsis),
    imageUrl: emptyToNull(input.imageUrl),
    backdropUrl: emptyToNull(input.backdropUrl),
    rating: roundRating(input.rating),
    year: input.year ?? null,
    meta: emptyToNull(input.meta),
    accent: input.accent ?? null,
    trendingLabel: emptyToNull(input.trendingLabel),
    creditLabel: emptyToNull(input.creditLabel),
    highlightTags: input.highlightTags,
    studio: emptyToNull(input.studio),
    director: emptyToNull(input.director),
    originalAuthor: emptyToNull(input.originalAuthor),
    sourceMaterial: emptyToNull(input.sourceMaterial),
    producers: emptyToNull(input.producers),
    network: emptyToNull(input.network),
    country: emptyToNull(input.country),
    composer: emptyToNull(input.composer),
    status: emptyToNull(input.status),
    ageRating: emptyToNull(input.ageRating),
    imdbRating: roundRating(input.imdbRating),
    malScore: roundRating(input.malScore),
    airedFrom: emptyToNull(input.airedFrom),
    airedTo: emptyToNull(input.airedTo),
    broadcast: emptyToNull(input.broadcast),
    episodeDuration: emptyToNull(input.episodeDuration),
    airingDay: emptyToNull(input.airingDay),
    seasonLabel: emptyToNull(input.seasonLabel),
    lastUpdate: emptyToNull(input.lastUpdate),
    languages: input.languages,
    seasonCount: input.seasonCount ?? null,
    episodeCount: input.episodeCount ?? null,
    videoUrl: emptyToNull(input.videoUrl),
    trailerUrl: emptyToNull(input.trailerUrl),
    tmdbId: input.tmdbId ?? null,
    tmdbKind: input.tmdbKind || null,
  };
}

async function syncNestedContentRelations(
  contentId: string,
  input: ContentFormInput,
) {
  await prisma.$transaction([
    prisma.contentEpisode.deleteMany({ where: { contentId } }),
    prisma.contentSeason.deleteMany({ where: { contentId } }),
    prisma.contentCharacter.deleteMany({ where: { contentId } }),
    prisma.contentFeaturedTrack.deleteMany({ where: { contentId } }),
    prisma.contentRelated.deleteMany({ where: { contentId } }),
    prisma.catalogReview.deleteMany({ where: { contentId } }),
  ]);

  const seasonIdByNumber = new Map<number, string>();

  for (const [index, season] of input.seasons.entries()) {
    const row = await prisma.contentSeason.create({
      data: {
        contentId,
        label: season.label,
        episodeCount: season.episodeCount ?? 0,
        position: index,
      },
    });
    seasonIdByNumber.set(index + 1, row.id);
  }

  for (const [index, episode] of input.episodes.entries()) {
    await prisma.contentEpisode.create({
      data: {
        contentId,
        seasonId: seasonIdByNumber.get(episode.seasonNumber) ?? null,
        seasonNumber: episode.seasonNumber,
        number: episode.number,
        title: episode.title,
        duration: emptyToNull(episode.duration),
        description: emptyToNull(episode.description),
        thumbnailUrl: emptyToNull(episode.thumbnailUrl),
        videoUrl: emptyToNull(episode.videoUrl),
        releaseDate: emptyToNull(episode.releaseDate),
        language: emptyToNull(episode.language),
        rating: roundRating(episode.rating),
        position: index,
      },
    });
  }

  for (const [index, character] of input.characters.entries()) {
    await prisma.contentCharacter.create({
      data: {
        contentId,
        name: character.name,
        role: emptyToNull(character.role),
        voiceActor: emptyToNull(character.voiceActor),
        imageUrl: emptyToNull(character.imageUrl),
        accent: character.accent ?? null,
        position: index,
      },
    });
  }

  if (input.featuredTrackSlugs.length > 0) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { title: true },
    });
    const tracks = await prisma.musicTrack.findMany({
      where: { slug: { in: input.featuredTrackSlugs } },
      select: { id: true, slug: true },
    });
    const trackBySlug = new Map(tracks.map((t) => [t.slug, t.id]));
    for (const [index, slug] of input.featuredTrackSlugs.entries()) {
      const trackId = trackBySlug.get(slug);
      if (!trackId) continue;
      await prisma.contentFeaturedTrack.create({
        data: { contentId, trackId, position: index },
      });
      await prisma.musicTrack.update({
        where: { id: trackId },
        data: {
          contentId,
          source: content?.title ?? undefined,
        },
      });
    }
  }

  await prisma.musicTrack.updateMany({
    where: {
      contentId,
      slug: { notIn: input.featuredTrackSlugs },
    },
    data: {
      contentId: null,
    },
  });

  if (input.relatedContentSlugs.length > 0) {
    const related = await prisma.content.findMany({
      where: { slug: { in: input.relatedContentSlugs } },
      select: { id: true, slug: true },
    });
    const relatedBySlug = new Map(related.map((r) => [r.slug, r.id]));
    for (const [index, slug] of input.relatedContentSlugs.entries()) {
      const relatedId = relatedBySlug.get(slug);
      if (!relatedId || relatedId === contentId) continue;
      await prisma.contentRelated.create({
        data: { contentId, relatedId, position: index },
      });
    }
  }

  for (const [index, review] of input.catalogReviews.entries()) {
    await prisma.catalogReview.create({
      data: {
        contentId,
        authorName: review.authorName,
        authorAvatarColor: emptyToNull(review.authorAvatarColor) ?? "#ff00cc",
        rating: roundRating(review.rating) ?? 0,
        headline: emptyToNull(review.headline),
        body: review.body,
        accent: review.accent ?? null,
        likeCount: review.likeCount ?? 0,
        position: index,
      },
    });
  }
}

export async function listCatalogContent(options: {
  search?: string;
  type?: MediaType;
  page?: number;
  pageSize?: number;
}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const where: Prisma.ContentWhereInput = {};

  if (options.type) {
    where.type = appMediaTypeToPrisma(options.type);
  }

  if (options.search) {
    where.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { slug: { contains: options.search, mode: "insensitive" } },
      { nativeTitle: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.content.findMany({
      where,
      include: contentInclude,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.content.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      recordId: row.id,
      item: mapContentToItem(row),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listAllContentSlugs() {
  const rows = await prisma.content.findMany({
    select: { slug: true },
    orderBy: { title: "asc" },
  });
  return rows.map((row) => row.slug);
}

export async function getContentRecordById(id: string) {
  return prisma.content.findUnique({
    where: { id },
    include: contentInclude,
  });
}

export async function getContentRecordBySlug(slug: string) {
  return prisma.content.findUnique({
    where: { slug },
    include: contentInclude,
  });
}

export async function getContentItemBySlug(slug: string): Promise<ContentItem | null> {
  const row = await getContentRecordBySlug(slug);
  return row ? mapContentToItem(row) : null;
}

export async function createCatalogContent(input: ContentFormInput) {
  const genres = await upsertGenreLabels(input.genreLabels);

  const row = await prisma.content.create({
    data: {
      ...toContentData(input),
      genres: {
        create: genres.map((genre) => ({ genreId: genre.id })),
      },
    },
    include: contentInclude,
  });

  await syncNestedContentRelations(row.id, input);

  return prisma.content.findUniqueOrThrow({
    where: { id: row.id },
    include: contentInclude,
  });
}

export async function updateCatalogContent(id: string, input: ContentFormInput) {
  const genres = await upsertGenreLabels(input.genreLabels);

  await prisma.contentGenre.deleteMany({ where: { contentId: id } });

  await prisma.content.update({
    where: { id },
    data: {
      ...toContentData(input),
      genres: {
        create: genres.map((genre) => ({ genreId: genre.id })),
      },
    },
  });

  await syncNestedContentRelations(id, input);

  return prisma.content.findUniqueOrThrow({
    where: { id },
    include: contentInclude,
  });
}

export async function deleteCatalogContent(id: string) {
  return prisma.content.delete({ where: { id } });
}

export async function countCatalogContent() {
  return prisma.content.count();
}

/** Engagement KPIs — derived from user activity, never from admin POST. */
export async function getContentEngagementStats(contentId: string) {
  const [content, favorites, watching, collections] = await Promise.all([
    prisma.content.findUnique({
      where: { id: contentId },
      select: { viewCount: true },
    }),
    prisma.contentFavorite.count({ where: { contentId } }),
    prisma.watchlistItem.count({
      where: { contentId, status: "WATCHING" },
    }),
    prisma.collectionItem.count({ where: { contentId } }),
  ]);

  return {
    favorites,
    watching,
    views: content?.viewCount ?? 0,
    collections,
  };
}

export async function recordContentPageView(contentSlug: string) {
  const content = await prisma.content.findUnique({
    where: { slug: contentSlug },
    select: { id: true },
  });
  if (!content) return null;

  const updated = await prisma.content.update({
    where: { id: content.id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });

  return updated.viewCount;
}

export { formatEngagementCount } from "@/lib/format-engagement";

export class ContentConflictError extends Error {
  constructor() {
    super("A content item with this slug already exists.");
    this.name = "ContentConflictError";
  }
}

export function isUniqueSlugError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export function contentRecordToFormInput(row: ContentRecordFull): ContentFormInput {
  const languages = Array.isArray(row.languages)
    ? (row.languages as string[])
    : [];
  const highlightTags = Array.isArray(row.highlightTags)
    ? (row.highlightTags as string[])
    : [];

  return {
    title: row.title,
    nativeTitle: row.nativeTitle ?? "",
    slug: row.slug,
    type: prismaMediaTypeToApp(row.type) as ContentFormInput["type"],
    description: row.description ?? "",
    synopsis: row.synopsis ?? "",
    imageUrl: row.imageUrl ?? "",
    backdropUrl: row.backdropUrl ?? "",
    rating: roundRating(row.rating) ?? undefined,
    year: row.year ?? undefined,
    meta: row.meta ?? "",
    accent: (row.accent as ContentFormInput["accent"]) ?? undefined,
    trendingLabel: row.trendingLabel ?? "",
    creditLabel: row.creditLabel ?? "",
    highlightTags,
    studio: row.studio ?? "",
    director: row.director ?? "",
    originalAuthor: row.originalAuthor ?? "",
    sourceMaterial: row.sourceMaterial ?? "",
    producers: row.producers ?? "",
    network: row.network ?? "",
    country: row.country ?? "",
    composer: row.composer ?? "",
    status: row.status ?? "",
    ageRating: row.ageRating ?? "",
    imdbRating: roundRating(row.imdbRating) ?? undefined,
    malScore: roundRating(row.malScore) ?? undefined,
    airedFrom: row.airedFrom ?? "",
    airedTo: row.airedTo ?? "",
    broadcast: row.broadcast ?? "",
    episodeDuration: row.episodeDuration ?? "",
    airingDay: row.airingDay ?? "",
    seasonLabel: row.seasonLabel ?? "",
    lastUpdate: row.lastUpdate ?? "",
    languages,
    seasonCount: row.seasonCount ?? undefined,
    episodeCount: row.episodeCount ?? undefined,
    videoUrl: row.videoUrl ?? "",
    trailerUrl: row.trailerUrl ?? "",
    tmdbId: row.tmdbId ?? undefined,
    tmdbKind: (row.tmdbKind as "movie" | "tv" | null) ?? "",
    genreLabels: row.genres.map(
      (g) => g.genre.label as ContentFormInput["genreLabels"][number],
    ),
    seasons: row.seasons.map((s) => ({
      label: s.label,
      episodeCount: s.episodeCount,
    })),
    episodes: row.episodes.map((e) => ({
      seasonNumber: e.seasonNumber,
      number: e.number,
      title: e.title,
      duration: e.duration ?? "",
      description: e.description ?? "",
      thumbnailUrl: e.thumbnailUrl ?? "",
      videoUrl: e.videoUrl ?? "",
      releaseDate: e.releaseDate ?? "",
      language: e.language ?? "",
      rating: roundRating(e.rating) ?? undefined,
    })),
    characters: row.characters.map((c) => ({
      name: c.name,
      role: c.role ?? "",
      voiceActor: c.voiceActor ?? "",
      imageUrl: c.imageUrl ?? "",
      accent: (c.accent as ContentFormInput["accent"]) ?? undefined,
    })),
    featuredTrackSlugs: row.featuredTracks.map((f) => f.track.slug),
    relatedContentSlugs: row.relatedFrom.map((r) => r.related.slug),
    catalogReviews: row.catalogReviews.map((r) => ({
      authorName: r.authorName,
      authorAvatarColor: r.authorAvatarColor ?? "",
      rating: roundRating(r.rating) ?? 0,
      headline: r.headline ?? "",
      body: r.body,
      accent: (r.accent as ContentFormInput["catalogReviews"][number]["accent"]) ?? undefined,
      likeCount: r.likeCount,
    })),
  };
}
