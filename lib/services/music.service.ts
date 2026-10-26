import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseListenLinks } from "@/lib/listen-links";
import { mapTrackToMusicTrack } from "@/lib/mappers/music.mapper";
import { prismaMediaTypeToApp } from "@/lib/mappers/content.mapper";
import type { MusicFormInput } from "@/lib/validators/admin/music";
import { roundRating } from "@/lib/format-rating";

const trackInclude = {
  artistRef: true,
  sourceContent: {
    include: {
      genres: { include: { genre: true } },
    },
  },
  catalogReviews: { orderBy: { position: "asc" as const } },
} satisfies Prisma.MusicTrackInclude;

export type TrackRecordFull = Prisma.MusicTrackGetPayload<{
  include: typeof trackInclude;
}>;

function asGenreArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function emptyToNull(value: string | undefined) {
  if (value == null || value === "") return null;
  return value;
}

function slugifyArtist(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveArtistId(slug?: string, artistName?: string) {
  const normalizedSlug = slug?.trim().toLowerCase();
  if (normalizedSlug) {
    const bySlug = await prisma.artist.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });
    if (bySlug) return bySlug.id;
  }

  const name = artistName?.trim();
  if (!name) return null;

  const byTitle = await prisma.artist.findFirst({
    where: { title: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (byTitle) return byTitle.id;

  const slugified = slugifyArtist(name);
  if (slugified) {
    const byDerivedSlug = await prisma.artist.findUnique({
      where: { slug: slugified },
      select: { id: true },
    });
    if (byDerivedSlug) return byDerivedSlug.id;
  }

  return null;
}

async function syncTrackReviews(trackId: string, input: MusicFormInput) {
  await prisma.catalogReview.deleteMany({ where: { trackId } });
  for (const [index, review] of input.catalogReviews.entries()) {
    await prisma.catalogReview.create({
      data: {
        trackId,
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

async function toTrackData(input: MusicFormInput): Promise<Prisma.MusicTrackCreateInput> {
  const artistId = await resolveArtistId(input.artistSlug, input.artist);

  return {
    title: input.title,
    slug: input.slug,
    nativeTitle: emptyToNull(input.nativeTitle),
    artist: input.artist,
    kind: input.kind,
    description: emptyToNull(input.description),
    lyrics: emptyToNull(input.lyrics),
    source: emptyToNull(input.source),
    album: emptyToNull(input.album),
    language: emptyToNull(input.language),
    genres: input.genreLabels,
    rating: roundRating(input.rating),
    year: input.year ?? null,
    durationLabel: emptyToNull(input.durationLabel),
    durationSeconds: input.durationSeconds ?? null,
    imageUrl: emptyToNull(input.imageUrl),
    backdropUrl: emptyToNull(input.backdropUrl),
    audioUrl: emptyToNull(input.audioUrl),
    previewUrl: emptyToNull(input.previewUrl),
    listenLinks: input.listenLinks,
    accent: input.accent ?? null,
    trendingLabel: emptyToNull(input.trendingLabel),
    creditLabel: emptyToNull(input.creditLabel),
    featuredRank: input.featuredRank ?? null,
    ...(artistId
      ? { artistRef: { connect: { id: artistId } } }
      : input.artistSlug === ""
        ? { artistRef: { disconnect: true } }
        : {}),
  } as Prisma.MusicTrackCreateInput;
}

export async function listCatalogTracks(options: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const where: Prisma.MusicTrackWhereInput = {};

  if (options.search) {
    where.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { slug: { contains: options.search, mode: "insensitive" } },
      { artist: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.musicTrack.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.musicTrack.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      recordId: row.id,
      track: mapTrackToMusicTrack(row),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTrackRecordById(id: string) {
  return prisma.musicTrack.findUnique({
    where: { id },
    include: trackInclude,
  });
}

export async function getTrackRecordBySlug(slug: string) {
  return prisma.musicTrack.findUnique({
    where: { slug },
    include: trackInclude,
  });
}

export async function createCatalogTrack(input: MusicFormInput) {
  const row = await prisma.musicTrack.create({
    data: await toTrackData(input),
    include: trackInclude,
  });
  await syncTrackReviews(row.id, input);
  return getTrackRecordById(row.id);
}

export async function updateCatalogTrack(id: string, input: MusicFormInput) {
  await prisma.musicTrack.update({
    where: { id },
    data: await toTrackData(input),
  });
  await syncTrackReviews(id, input);
  return getTrackRecordById(id);
}

export async function deleteCatalogTrack(id: string) {
  return prisma.musicTrack.delete({ where: { id } });
}

export async function countCatalogTracks() {
  return prisma.musicTrack.count();
}

export async function getTrackEngagementStats(trackId: string) {
  const [reviews, listening, listenEvents, collections] = await Promise.all([
    prisma.catalogReview.count({ where: { trackId } }),
    prisma.listenEvent.count({
      where: {
        trackId,
        listenedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    }),
    prisma.listenEvent.count({ where: { trackId } }),
    prisma.collectionItem.count({ where: { trackId } }),
  ]);

  return { reviews, listening, listenEvents, collections };
}

export interface TrackLinkedSelections {
  artist: {
    id: string;
    type: "artist";
    title: string;
    subtitle?: string;
    imageUrl?: string;
  } | null;
  source: {
    id: string;
    type: "content";
    title: string;
    subtitle?: string;
    imageUrl?: string;
  } | null;
}

export function trackRecordToLinkedSelections(
  row: TrackRecordFull,
): TrackLinkedSelections {
  return {
    artist: row.artistRef
      ? {
          id: row.artistRef.slug,
          type: "artist",
          title: row.artistRef.title,
          subtitle: row.artistRef.isGroup ? "Group" : "Solo Artist",
          imageUrl: row.artistRef.imageUrl ?? undefined,
        }
      : null,
    source: row.sourceContent
      ? {
          id: row.sourceContent.slug,
          type: "content",
          title: row.sourceContent.title,
          subtitle: prismaMediaTypeToApp(row.sourceContent.type),
          imageUrl: row.sourceContent.imageUrl ?? undefined,
        }
      : null,
  };
}

export function trackRecordToFormInput(row: TrackRecordFull): MusicFormInput {
  return {
    title: row.title,
    nativeTitle: row.nativeTitle ?? "",
    slug: row.slug,
    artist: row.artist,
    artistSlug: row.artistRef?.slug ?? "",
    kind: row.kind as MusicFormInput["kind"],
    description: row.description ?? "",
    lyrics: row.lyrics ?? "",
    source: row.source ?? "",
    album: row.album ?? "",
    language: (row.language ?? "") as MusicFormInput["language"],
    genreLabels: asGenreArray((row as { genres?: unknown }).genres) as MusicFormInput["genreLabels"],
    rating: roundRating(row.rating) ?? undefined,
    year: row.year ?? undefined,
    durationLabel: row.durationLabel ?? "",
    durationSeconds: row.durationSeconds ?? undefined,
    imageUrl: row.imageUrl ?? "",
    backdropUrl: row.backdropUrl ?? "",
    audioUrl: row.audioUrl ?? "",
    previewUrl: row.previewUrl ?? "",
    listenLinks: parseListenLinks(row.listenLinks),
    accent: (row.accent as MusicFormInput["accent"]) ?? undefined,
    trendingLabel: row.trendingLabel ?? "",
    creditLabel: row.creditLabel ?? "",
    contentSlug: row.sourceContent?.slug ?? "",
    featuredRank: row.featuredRank ?? undefined,
    catalogReviews: row.catalogReviews.map((r) => ({
      authorName: r.authorName,
      authorAvatarColor: r.authorAvatarColor ?? "",
      rating: roundRating(r.rating) ?? 0,
      headline: r.headline ?? "",
      body: r.body,
      accent: (r.accent as MusicFormInput["catalogReviews"][number]["accent"]) ?? undefined,
      likeCount: r.likeCount,
    })),
  };
}

export class MusicConflictError extends Error {
  constructor() {
    super("A track with this slug already exists.");
    this.name = "MusicConflictError";
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
