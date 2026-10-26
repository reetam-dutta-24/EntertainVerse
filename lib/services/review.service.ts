import type { Prisma, Review } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapReviewRow } from "@/lib/mappers/user-profile.mapper";
import { roundRating } from "@/lib/format-rating";
import { getLikedReviewIds } from "@/lib/services/like.service";
import { notifyReviewPublished } from "@/lib/services/notification.service";
import type { ReviewTargetType } from "@/lib/review-routes";
import type { Review as AppReview } from "@/types";
import type {
  ReviewFormInput,
  ReviewUpdateInput,
} from "@/lib/validators/review";

export type { ReviewTargetType } from "@/lib/review-routes";

const authorSelect = {
  id: true,
  name: true,
  handle: true,
  avatarColor: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const reviewInclude = {
  author: { select: authorSelect },
} satisfies Prisma.ReviewInclude;

export type ReviewWithAuthor = Review & {
  author: {
    id: string;
    name: string;
    handle: string;
    avatarColor: string;
    avatarUrl: string | null;
  };
};

export class ReviewNotFoundError extends Error {
  constructor() {
    super("Review not found.");
    this.name = "ReviewNotFoundError";
  }
}

export class ReviewForbiddenError extends Error {
  constructor() {
    super("You can only edit your own reviews.");
    this.name = "ReviewForbiddenError";
  }
}

export class ReviewTargetNotFoundError extends Error {
  constructor(target: ReviewTargetType) {
    super(
      target === "content"
        ? "Content not found."
        : target === "song"
          ? "Song not found."
          : target === "community"
            ? "Community not found."
            : "Artist not found.",
    );
    this.name = "ReviewTargetNotFoundError";
  }
}

export class ReviewConflictError extends Error {
  constructor() {
    super("You already reviewed this. Edit your existing review instead.");
    this.name = "ReviewConflictError";
  }
}

export function isReviewNotFound(error: unknown): error is ReviewNotFoundError {
  return error instanceof ReviewNotFoundError;
}

export function isReviewForbidden(error: unknown): error is ReviewForbiddenError {
  return error instanceof ReviewForbiddenError;
}

export function isReviewTargetNotFound(
  error: unknown,
): error is ReviewTargetNotFoundError {
  return error instanceof ReviewTargetNotFoundError;
}

export function isReviewConflict(error: unknown): error is ReviewConflictError {
  return error instanceof ReviewConflictError;
}

async function resolveTargetId(
  target: ReviewTargetType,
  slug: string,
): Promise<string> {
  if (target === "content") {
    const row = await prisma.content.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!row) throw new ReviewTargetNotFoundError(target);
    return row.id;
  }

  if (target === "song") {
    const row = await prisma.musicTrack.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!row) throw new ReviewTargetNotFoundError(target);
    return row.id;
  }

  if (target === "community") {
    const row = await prisma.community.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!row) throw new ReviewTargetNotFoundError(target);
    return row.id;
  }

  const row = await prisma.artist.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!row) throw new ReviewTargetNotFoundError(target);
  return row.id;
}

function targetWhere(
  target: ReviewTargetType,
  targetId: string,
): Pick<
  Prisma.ReviewWhereInput,
  "contentId" | "trackId" | "artistId" | "communityId"
> {
  if (target === "content") return { contentId: targetId };
  if (target === "song") return { trackId: targetId };
  if (target === "community") return { communityId: targetId };
  return { artistId: targetId };
}

function targetData(
  target: ReviewTargetType,
  targetId: string,
): Pick<
  Prisma.ReviewCreateInput,
  "content" | "track" | "artist" | "community"
> {
  if (target === "content") {
    return { content: { connect: { id: targetId } } };
  }
  if (target === "song") {
    return { track: { connect: { id: targetId } } };
  }
  if (target === "community") {
    return { community: { connect: { id: targetId } } };
  }
  return { artist: { connect: { id: targetId } } };
}

async function getReviewOrThrow(reviewId: string): Promise<ReviewWithAuthor> {
  const row = await prisma.review.findUnique({
    where: { id: reviewId },
    include: reviewInclude,
  });
  if (!row) throw new ReviewNotFoundError();
  return row;
}

export async function mapReviewsForViewer(
  rows: ReviewWithAuthor[],
  viewerUserId?: string,
): Promise<AppReview[]> {
  const likedIds = await getLikedReviewIds(
    viewerUserId,
    rows.map((row) => row.id),
  );
  return rows.map((row) =>
    mapReviewRow(row, { likedByViewer: likedIds.has(row.id) }),
  );
}

export async function getUserReviewsForTarget(
  target: ReviewTargetType,
  slug: string,
  viewerUserId?: string,
): Promise<AppReview[]> {
  const rows = await listReviewsForTarget(target, slug);
  return mapReviewsForViewer(rows, viewerUserId);
}

export function mergeDisplayedReviews(
  userReviews: AppReview[],
  catalogReviews: AppReview[],
): AppReview[] {
  return [...userReviews, ...catalogReviews];
}

export async function listReviewsForTarget(
  target: ReviewTargetType,
  slug: string,
  limit = 24,
): Promise<ReviewWithAuthor[]> {
  const targetId = await resolveTargetId(target, slug);
  return prisma.review.findMany({
    where: targetWhere(target, targetId),
    include: reviewInclude,
    orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function createReview(
  userId: string,
  target: ReviewTargetType,
  slug: string,
  input: ReviewFormInput,
): Promise<ReviewWithAuthor> {
  const targetId = await resolveTargetId(target, slug);

  const existing = await prisma.review.findFirst({
    where: {
      authorId: userId,
      ...targetWhere(target, targetId),
    },
    select: { id: true },
  });
  if (existing) throw new ReviewConflictError();

  const targetMeta = await resolveTargetMeta(target, targetId);

  const row = await prisma.review
    .create({
      data: {
        author: { connect: { id: userId } },
        rating: roundRating(input.rating) ?? 0,
        headline: input.headline?.trim() || null,
        body: input.body.trim(),
        ...targetData(target, targetId),
      },
      include: reviewInclude,
    })
    .catch((error: unknown) => {
      // A simultaneous second submit passes the check above; the unique index stops it.
      if ((error as { code?: string } | null)?.code === "P2002") throw new ReviewConflictError();
      throw error;
    });

  await notifyReviewPublished({
    userId,
    targetLabel: targetMeta.label,
    href: targetMeta.href,
    imageUrl: targetMeta.imageUrl,
    headline: input.headline?.trim() || undefined,
  });

  return row;
}

async function resolveTargetMeta(
  target: ReviewTargetType,
  targetId: string,
): Promise<{ label: string; href: string; imageUrl?: string }> {
  if (target === "content") {
    const row = await prisma.content.findUnique({
      where: { id: targetId },
      select: { slug: true, title: true, imageUrl: true },
    });
    return {
      label: row?.title ?? "this title",
      href: `/content/${row?.slug ?? targetId}`,
      imageUrl: row?.imageUrl ?? undefined,
    };
  }

  if (target === "song") {
    const row = await prisma.musicTrack.findUnique({
      where: { id: targetId },
      select: { slug: true, title: true, imageUrl: true },
    });
    return {
      label: row?.title ?? "this song",
      href: `/song/${row?.slug ?? targetId}`,
      imageUrl: row?.imageUrl ?? undefined,
    };
  }

  if (target === "community") {
    const row = await prisma.community.findUnique({
      where: { id: targetId },
      select: { slug: true, name: true, imageUrl: true },
    });
    return {
      label: row?.name ?? "this community",
      href: `/community/${row?.slug ?? targetId}`,
      imageUrl: row?.imageUrl ?? undefined,
    };
  }

  const row = await prisma.artist.findUnique({
    where: { id: targetId },
    select: { slug: true, title: true, imageUrl: true },
  });
  return {
    label: row?.title ?? "this artist",
    href: `/artist/${row?.slug ?? targetId}`,
    imageUrl: row?.imageUrl ?? undefined,
  };
}

export async function updateReview(
  userId: string,
  reviewId: string,
  input: ReviewUpdateInput,
): Promise<ReviewWithAuthor> {
  const existing = await getReviewOrThrow(reviewId);
  if (existing.authorId !== userId) throw new ReviewForbiddenError();

  const data: Prisma.ReviewUpdateInput = {};
  if (input.rating !== undefined) data.rating = roundRating(input.rating) ?? 0;
  if (input.headline !== undefined) {
    data.headline = input.headline.trim() || null;
  }
  if (input.body !== undefined) data.body = input.body.trim();

  return prisma.review.update({
    where: { id: reviewId },
    data,
    include: reviewInclude,
  });
}

export async function deleteReview(
  userId: string,
  reviewId: string,
): Promise<void> {
  const existing = await getReviewOrThrow(reviewId);
  if (existing.authorId !== userId) throw new ReviewForbiddenError();
  await prisma.review.delete({ where: { id: reviewId } });
}
