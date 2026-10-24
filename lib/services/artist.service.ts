import type { Prisma } from "@prisma/client";
import { parseListenLinks } from "@/lib/listen-links";
import { prisma } from "@/lib/prisma";
import type { ArtistFormInput } from "@/lib/validators/admin/artist";
import { roundRating } from "@/lib/format-rating";

const artistInclude = {
  members: { orderBy: { position: "asc" as const } },
  catalogReviews: { orderBy: { position: "asc" as const } },
  tracks: { orderBy: [{ featuredRank: "asc" as const }, { title: "asc" as const }] },
} satisfies Prisma.ArtistInclude;

export type ArtistRecordFull = Prisma.ArtistGetPayload<{
  include: typeof artistInclude;
}>;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function emptyToNull(value: string | undefined) {
  if (value == null || value === "") return null;
  return value;
}

function toArtistData(input: ArtistFormInput): Prisma.ArtistCreateInput {
  return {
    title: input.title,
    slug: input.slug,
    nativeTitle: emptyToNull(input.nativeTitle),
    synopsis: emptyToNull(input.synopsis),
    imageUrl: emptyToNull(input.imageUrl),
    accent: input.accent ?? null,
    rating: roundRating(input.rating),
    rankLeft: emptyToNull(input.rankLeft),
    rankRight: emptyToNull(input.rankRight),
    primaryTags: input.primaryTags,
    languages: input.languages,
    genres: input.genreLabels,
    label: emptyToNull(input.label),
    debutYear: input.debutYear ?? null,
    isGroup: input.isGroup,
    listenLinks: input.listenLinks,
  } as Prisma.ArtistCreateInput;
}

async function syncArtistNested(artistId: string, input: ArtistFormInput) {
  await prisma.$transaction([
    prisma.artistMember.deleteMany({ where: { artistId } }),
    prisma.catalogReview.deleteMany({ where: { artistId } }),
  ]);

  if (input.isGroup) {
    for (const [index, member] of input.members.entries()) {
      await prisma.artistMember.create({
        data: {
          artistId,
          name: member.name,
          role: emptyToNull(member.role),
          imageUrl: emptyToNull(member.imageUrl),
          position: index,
        },
      });
    }
  }

  for (const [index, review] of input.catalogReviews.entries()) {
    await prisma.catalogReview.create({
      data: {
        artistId,
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

export async function listCatalogArtists(options: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const where: Prisma.ArtistWhereInput = {};

  if (options.search) {
    where.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { slug: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.artist.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.artist.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      recordId: row.id,
      slug: row.slug,
      title: row.title,
      imageUrl: row.imageUrl,
      isGroup: row.isGroup,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getArtistRecordById(id: string) {
  return prisma.artist.findUnique({
    where: { id },
    include: artistInclude,
  });
}

export async function getArtistRecordBySlug(slug: string) {
  return prisma.artist.findUnique({
    where: { slug },
    include: artistInclude,
  });
}

export async function listAllArtistSlugs() {
  const rows = await prisma.artist.findMany({
    select: { slug: true },
    orderBy: { title: "asc" },
  });
  return rows.map((r) => r.slug);
}

export async function createCatalogArtist(input: ArtistFormInput) {
  const row = await prisma.artist.create({
    data: toArtistData(input),
    include: artistInclude,
  });
  await syncArtistNested(row.id, input);
  return getArtistRecordById(row.id);
}

export async function updateCatalogArtist(id: string, input: ArtistFormInput) {
  await prisma.artist.update({
    where: { id },
    data: toArtistData(input),
  });
  await syncArtistNested(id, input);
  return getArtistRecordById(id);
}

export async function deleteCatalogArtist(id: string) {
  return prisma.artist.delete({ where: { id } });
}

export async function countCatalogArtists() {
  return prisma.artist.count();
}

export function artistRecordToFormInput(row: ArtistRecordFull): ArtistFormInput {
  return {
    title: row.title,
    nativeTitle: row.nativeTitle ?? "",
    slug: row.slug,
    synopsis: row.synopsis ?? "",
    imageUrl: row.imageUrl ?? "",
    accent: (row.accent as ArtistFormInput["accent"]) ?? undefined,
    rating: roundRating(row.rating) ?? undefined,
    rankLeft: row.rankLeft ?? "",
    rankRight: row.rankRight ?? "",
    primaryTags: Array.isArray(row.primaryTags) ? (row.primaryTags as string[]) : [],
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : [],
    label: row.label ?? "",
    debutYear: row.debutYear ?? undefined,
    isGroup: row.isGroup,
    members: row.members.map((m) => ({
      name: m.name,
      role: m.role ?? "",
      imageUrl: m.imageUrl ?? "",
    })),
    genreLabels: asStringArray((row as { genres?: unknown }).genres) as ArtistFormInput["genreLabels"],
    listenLinks: parseListenLinks(row.listenLinks),
    catalogReviews: row.catalogReviews.map((r) => ({
      authorName: r.authorName,
      authorAvatarColor: r.authorAvatarColor ?? "",
      rating: roundRating(r.rating) ?? 0,
      headline: r.headline ?? "",
      body: r.body,
      accent: (r.accent as ArtistFormInput["catalogReviews"][number]["accent"]) ?? undefined,
      likeCount: r.likeCount,
    })),
  };
}

export class ArtistConflictError extends Error {
  constructor() {
    super("An artist with this slug already exists.");
    this.name = "ArtistConflictError";
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
