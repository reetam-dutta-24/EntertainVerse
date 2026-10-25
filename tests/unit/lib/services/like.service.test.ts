import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { getLikedPostIds, getLikedReviewIds, isLikeNotFound, LikeNotFoundError, toggleCommunityPostLike, toggleReviewLike } = await import(
  "@/lib/services/like.service"
);

describe("getLikedPostIds / getLikedReviewIds", () => {
  it("returns the ids the user liked", async () => {
    prisma.communityPostLike.findMany.mockResolvedValue([{ postId: "p1" }, { postId: "p3" }]);
    expect(await getLikedPostIds("u1", ["p1", "p2", "p3"])).toEqual(new Set(["p1", "p3"]));
    expect(prisma.communityPostLike.findMany).toHaveBeenCalledWith({ where: { userId: "u1", postId: { in: ["p1", "p2", "p3"] } }, select: { postId: true } });

    prisma.reviewLike.findMany.mockResolvedValue([{ reviewId: "r2" }]);
    expect(await getLikedReviewIds("u1", ["r1", "r2"])).toEqual(new Set(["r2"]));
  });

  it("skips the query for signed-out viewers and empty lists", async () => {
    expect(await getLikedPostIds(undefined, ["p1"])).toEqual(new Set());
    expect(await getLikedPostIds("u1", [])).toEqual(new Set());
    expect(await getLikedReviewIds(undefined, ["r1"])).toEqual(new Set());
    expect(prisma.communityPostLike.findMany).not.toHaveBeenCalled();
    expect(prisma.reviewLike.findMany).not.toHaveBeenCalled();
  });
});

describe("toggleCommunityPostLike", () => {
  beforeEach(() => {
    prisma.community.findUnique.mockResolvedValue({ id: "c1" });
    prisma.communityPost.findFirst.mockResolvedValue({ id: "p1", likeCount: 4 });
    prisma.communityPostLike.findUnique.mockResolvedValue(null);
  });

  it("likes a post and increments the count in one transaction", async () => {
    prisma.communityPost.update.mockResolvedValue({ likeCount: 5 });

    expect(await toggleCommunityPostLike("u1", "anime-club", "p1")).toEqual({ liked: true, likeCount: 5 });
    expect(prisma.communityPostLike.create).toHaveBeenCalledWith({ data: { userId: "u1", postId: "p1" } });
    expect(prisma.communityPost.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1" }, data: { likeCount: { increment: 1 } } }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("unlikes an already-liked post and decrements the count", async () => {
    prisma.communityPostLike.findUnique.mockResolvedValue({ id: "like-1" });
    prisma.communityPost.update.mockResolvedValue({ likeCount: 3 });

    expect(await toggleCommunityPostLike("u1", "anime-club", "p1")).toEqual({ liked: false, likeCount: 3 });
    expect(prisma.communityPostLike.delete).toHaveBeenCalledWith({ where: { id: "like-1" } });
    expect(prisma.communityPost.update).toHaveBeenCalledWith(expect.objectContaining({ data: { likeCount: { decrement: 1 } } }));
    expect(prisma.communityPostLike.create).not.toHaveBeenCalled();
  });

  it("never reports a negative count", async () => {
    prisma.communityPostLike.findUnique.mockResolvedValue({ id: "like-1" });
    prisma.communityPost.update.mockResolvedValue({ likeCount: -1 });
    expect((await toggleCommunityPostLike("u1", "anime-club", "p1")).likeCount).toBe(0);
  });

  it("only finds the post inside the named community", async () => {
    prisma.communityPost.findFirst.mockResolvedValue(null);
    const attempt = toggleCommunityPostLike("u1", "other-club", "p1");

    await expect(attempt).rejects.toThrow(new LikeNotFoundError("Post not found."));
    expect(prisma.communityPost.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", communityId: "c1" } }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an unknown community", async () => {
    prisma.community.findUnique.mockResolvedValue(null);
    await expect(toggleCommunityPostLike("u1", "missing", "p1")).rejects.toThrow(new LikeNotFoundError("Community not found."));
  });
});

describe("toggleReviewLike", () => {
  beforeEach(() => {
    prisma.review.findUnique.mockResolvedValue({ id: "r1", likeCount: 0, authorId: "author" });
    prisma.reviewLike.findUnique.mockResolvedValue(null);
  });

  it("likes and increments", async () => {
    prisma.review.update.mockResolvedValue({ likeCount: 1 });
    expect(await toggleReviewLike("u1", "r1")).toEqual({ liked: true, likeCount: 1 });
    expect(prisma.reviewLike.findUnique).toHaveBeenCalledWith({ where: { userId_reviewId: { userId: "u1", reviewId: "r1" } } });
    expect(prisma.reviewLike.create).toHaveBeenCalledWith({ data: { userId: "u1", reviewId: "r1" } });
  });

  it("unlikes and decrements, clamped at zero", async () => {
    prisma.reviewLike.findUnique.mockResolvedValue({ id: "like-9" });
    prisma.review.update.mockResolvedValue({ likeCount: -2 });
    expect(await toggleReviewLike("u1", "r1")).toEqual({ liked: false, likeCount: 0 });
    expect(prisma.reviewLike.delete).toHaveBeenCalledWith({ where: { id: "like-9" } });
    expect(prisma.review.update).toHaveBeenCalledWith(expect.objectContaining({ data: { likeCount: { decrement: 1 } } }));
  });

  it("rejects an unknown review", async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    const attempt = toggleReviewLike("u1", "nope");
    await expect(attempt).rejects.toThrow("Review not found.");
    await expect(attempt.catch((error) => isLikeNotFound(error))).resolves.toBe(true);
    expect(prisma.reviewLike.create).not.toHaveBeenCalled();
  });
});
