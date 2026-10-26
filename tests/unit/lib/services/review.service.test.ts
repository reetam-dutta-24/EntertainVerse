import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";
import { reviewApiPath } from "@/lib/review-routes";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));
vi.mock("@/lib/services/notification.service", () => ({ notifyReviewPublished: vi.fn() }));
vi.mock("@/lib/services/like.service", () => ({ getLikedReviewIds: vi.fn(async () => new Set(["r-liked"])) }));
vi.mock("@/lib/mappers/user-profile.mapper", () => ({ mapReviewRow: vi.fn((row, extra) => ({ id: row.id, ...extra })) }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { notifyReviewPublished } = await import("@/lib/services/notification.service");
const reviews = await import("@/lib/services/review.service");

// target type → Prisma model holding it, the review's foreign key, its relation, and the target's public path.
const TARGETS = [
  ["content", "content", "contentId", "content", "/content/frieren"],
  ["song", "musicTrack", "trackId", "track", "/song/frieren"],
  ["artist", "artist", "artistId", "artist", "/artist/frieren"],
  ["community", "community", "communityId", "community", "/community/frieren"],
] as const;
const RELATIONS = ["content", "track", "artist", "community"];

const review = (fields: Record<string, unknown> = {}) => ({ id: "r1", authorId: "author", rating: 8, ...fields });

beforeEach(() => {
  for (const [, model] of TARGETS) {
    prisma[model]!.findUnique!.mockImplementation(async ({ where }: { where: { slug?: string; id?: string } }) =>
      where.slug === "missing" ? null : { id: `${model}-1`, slug: "frieren", title: "Frieren", name: "Frieren", imageUrl: null },
    );
  }
  prisma.review.findFirst.mockResolvedValue(null);
  prisma.review.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "r-new", ...data }));
  prisma.review.findUnique.mockResolvedValue(review());
});

describe.each(TARGETS)("reviews of a %s", (target, model, foreignKey, relation, href) => {
  it("creates one, linked to the target, and announces it", async () => {
    await reviews.createReview("u1", target, "frieren", { rating: 8.46, headline: "  Wow ", body: "  Loved it.  " });

    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ author: { connect: { id: "u1" } }, rating: 8.5, headline: "Wow", body: "Loved it." }),
      }),
    );
    // Linked to exactly this target, through the right relation.
    const { data } = prisma.review.create.mock.calls[0]![0];
    expect(data[relation]).toEqual({ connect: { id: `${model}-1` } });
    for (const other of RELATIONS.filter((name) => name !== relation)) expect(data).not.toHaveProperty(other);
    expect(notifyReviewPublished).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", href, targetLabel: "Frieren", headline: "Wow" }));
  });

  it("allows only one review per user", async () => {
    prisma.review.findFirst.mockResolvedValue({ id: "r-old" });
    await expect(reviews.createReview("u1", target, "frieren", { rating: 7, body: "Again" })).rejects.toBeInstanceOf(reviews.ReviewConflictError);
    expect(prisma.review.findFirst).toHaveBeenCalledWith({ where: { authorId: "u1", [foreignKey]: `${model}-1` }, select: { id: true } });
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it("is not found for an unknown target", async () => {
    await expect(reviews.createReview("u1", target, "missing", { rating: 7, body: "x" })).rejects.toBeInstanceOf(reviews.ReviewTargetNotFoundError);
    await expect(reviews.listReviewsForTarget(target, "missing")).rejects.toBeInstanceOf(reviews.ReviewTargetNotFoundError);
  });

  it("lists most-liked first", async () => {
    prisma.review.findMany.mockResolvedValue([]);
    await reviews.listReviewsForTarget(target, "frieren");
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { [foreignKey]: `${model}-1` }, orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }], take: 24 }),
    );
  });
});

// Two simultaneous submits both pass the findFirst check; the unique index on
// (authorId, target) rejects the second, and that surfaces as the same conflict.
it("treats a unique-constraint race as 'already reviewed'", async () => {
  prisma.review.findFirst.mockResolvedValue(null);
  prisma.review.create.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
  await expect(reviews.createReview("u1", "content", "frieren", { rating: 8, body: "Again" })).rejects.toBeInstanceOf(reviews.ReviewConflictError);
});

describe("createReview details", () => {
  it("stores a blank headline as null and an out-of-band rating as rounded", async () => {
    await reviews.createReview("u1", "content", "frieren", { rating: 10, headline: "   ", body: "Great" });
    expect(prisma.review.create.mock.calls[0]![0].data).toMatchObject({ headline: null, rating: 10 });
    expect(notifyReviewPublished).toHaveBeenCalledWith(expect.objectContaining({ headline: undefined }));
  });
});

describe("updateReview / deleteReview", () => {
  it("lets only the author edit", async () => {
    await expect(reviews.updateReview("someone-else", "r1", { body: "Hijacked" })).rejects.toBeInstanceOf(reviews.ReviewForbiddenError);
    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it("changes only the fields given", async () => {
    await reviews.updateReview("author", "r1", { rating: 6.04 });
    expect(prisma.review.update.mock.calls[0]![0]).toMatchObject({ where: { id: "r1" }, data: { rating: 6 } });
    expect(Object.keys(prisma.review.update.mock.calls[0]![0].data)).toEqual(["rating"]);

    await reviews.updateReview("author", "r1", { headline: "  ", body: " New " });
    expect(prisma.review.update.mock.calls[1]![0].data).toEqual({ headline: null, body: "New" });
  });

  it("lets only the author delete", async () => {
    await expect(reviews.deleteReview("someone-else", "r1")).rejects.toBeInstanceOf(reviews.ReviewForbiddenError);
    expect(prisma.review.delete).not.toHaveBeenCalled();
    await reviews.deleteReview("author", "r1");
    expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
  });

  it("is not found for an unknown review", async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    await expect(reviews.updateReview("author", "nope", { body: "x" })).rejects.toBeInstanceOf(reviews.ReviewNotFoundError);
    await expect(reviews.deleteReview("author", "nope")).rejects.toBeInstanceOf(reviews.ReviewNotFoundError);
  });
});

describe("display helpers", () => {
  it("marks the reviews the viewer liked", async () => {
    expect(await reviews.mapReviewsForViewer([review({ id: "r-liked" }), review({ id: "r-other" })] as never, "viewer")).toEqual([
      { id: "r-liked", likedByViewer: true },
      { id: "r-other", likedByViewer: false },
    ]);
  });

  it("shows user reviews before catalog reviews", () => {
    expect(reviews.mergeDisplayedReviews([{ id: "user" }] as never, [{ id: "catalog" }] as never).map((row) => row.id)).toEqual(["user", "catalog"]);
  });

  it("builds each target's reviews API path", () => {
    expect(reviewApiPath("content", "frieren")).toBe("/api/content/frieren/reviews");
    expect(reviewApiPath("song", "x")).toBe("/api/song/x/reviews");
    expect(reviewApiPath("artist", "x")).toBe("/api/artist/x/reviews");
    expect(reviewApiPath("community", "x")).toBe("/api/communities/x/reviews");
  });
});
