import "server-only";

import { prisma } from "@/lib/prisma";
import { dot, embeddingKey, loadEmbeddingIndex, type Vector } from "@/lib/recommender/embeddings";
import { minMax } from "@/lib/recommender/hybrid";
import { genreLabel, loadTasteSignals, tasteCentroids, topGenres } from "@/lib/services/taste-engine.service";

/**
 * Recommender for public collections and communities. Same hybrid idea as
 * titles: semantic fit to the user's taste, plus evidence from people —
 * collections holding titles you love, communities whose members love them too.
 */

export interface SocialPick {
  id: string;
  score: number;
  reason: string;
}

const pop = (count: number) => Math.min(1, Math.log1p(count) / Math.log(60));

async function userInterest(userId: string) {
  const signals = await loadTasteSignals(userId);
  const [centroids, genres] = await Promise.all([tasteCentroids(signals), topGenres(signals, 3)]);
  const loved = new Set([...signals.favoriteContent, ...signals.selection.favoriteTitles]);
  const watched = new Set([...signals.watched].filter(([, weight]) => weight >= 0.2).map(([slug]) => slug));
  const tracks = new Set([...signals.favoriteTracks, ...[...signals.listened].filter(([, w]) => w >= 0.2).map(([slug]) => slug)]);
  return { signals, centroids, genres, loved, watched, tracks };
}

function semanticMap(ids: string[], kind: "collection" | "community", vectors: Map<string, Vector>, target: (id: string) => Vector | null) {
  const raw = new Map<string, number>();
  for (const id of ids) {
    const vector = vectors.get(embeddingKey(kind, id));
    const goal = target(id);
    if (vector && goal) raw.set(id, dot(vector, goal));
  }
  return minMax(raw);
}

/** Rank candidate public collections for a user, with a "why this" each. */
export async function rankCollectionsForUser(
  userId: string,
  candidates: { id: string; kind: string; genreLabels: string[]; favoriteCount: number; followerCount: number }[],
): Promise<Map<string, SocialPick>> {
  if (!candidates.length) return new Map();
  const [interest, index, items] = await Promise.all([
    userInterest(userId),
    loadEmbeddingIndex(),
    prisma.collectionItem.findMany({
      where: { collectionId: { in: candidates.map((c) => c.id) } },
      select: { collectionId: true, content: { select: { slug: true, title: true } }, track: { select: { slug: true, title: true } } },
    }),
  ]);

  const shared = new Map<string, string[]>();
  for (const item of items) {
    const match =
      (item.content && (interest.loved.has(item.content.slug) || interest.watched.has(item.content.slug)) && item.content.title) ||
      (item.track && interest.tracks.has(item.track.slug) && item.track.title);
    if (!match) continue;
    shared.set(item.collectionId, [...(shared.get(item.collectionId) ?? []), match]);
  }

  const semantic = semanticMap(
    candidates.map((c) => c.id),
    "collection",
    index.vectors,
    (id) => (candidates.find((c) => c.id === id)?.kind === "music" ? interest.centroids.music : interest.centroids.content),
  );
  const topGenreSet = new Set(interest.genres);

  const picks = new Map<string, SocialPick>();
  for (const candidate of candidates) {
    const overlap = shared.get(candidate.id) ?? [];
    const sem = semantic.get(candidate.id);
    const popularity = pop(candidate.favoriteCount + candidate.followerCount);
    const overlapScore = Math.min(1, overlap.length / 3);
    const score = sem !== undefined ? sem * 0.5 + overlapScore * 0.35 + popularity * 0.15 : overlapScore * 0.7 + popularity * 0.3;

    const genreMatch = candidate.genreLabels.map((g) => g.toLowerCase()).find((g) => topGenreSet.has(g));
    const reason = overlap.length
      ? overlap.length === 1
        ? `Has ${overlap[0]}, which you love`
        : `Has ${overlap[0]} + ${overlap.length - 1} more you love`
      : genreMatch
        ? `Matches your love of ${genreLabel(genreMatch).label}`
        : sem !== undefined && sem >= 0.7
          ? "Close to your taste"
          : candidate.favoriteCount + candidate.followerCount > 0
            ? `Loved by ${candidate.favoriteCount + candidate.followerCount} fans`
            : "Fresh pick to widen your taste";
    picks.set(candidate.id, { id: candidate.id, score, reason });
  }
  return picks;
}

/** Rank candidate public communities: taste fit + members who love what you love. */
export async function rankCommunitiesForUser(
  userId: string,
  candidates: { id: string; category: string; memberCount: number; postCount: number }[],
): Promise<Map<string, SocialPick>> {
  if (!candidates.length) return new Map();
  const [interest, index, members] = await Promise.all([
    userInterest(userId),
    loadEmbeddingIndex(),
    prisma.communityMember.findMany({
      where: { communityId: { in: candidates.map((c) => c.id) }, userId: { not: userId } },
      select: { communityId: true, userId: true },
    }),
  ]);

  // Members who share at least one of the user's favorites ("kindred" members).
  const memberIds = [...new Set(members.map((m) => m.userId))];
  const lovedSlugs = [...interest.loved];
  const kindredUsers = new Set(
    memberIds.length && lovedSlugs.length
      ? (
          await prisma.contentFavorite.findMany({
            where: { userId: { in: memberIds }, content: { slug: { in: lovedSlugs } } },
            select: { userId: true },
          })
        ).map((row) => row.userId)
      : [],
  );
  const kindred = new Map<string, number>();
  for (const member of members) {
    if (kindredUsers.has(member.userId)) kindred.set(member.communityId, (kindred.get(member.communityId) ?? 0) + 1);
  }

  const semantic = semanticMap(candidates.map((c) => c.id), "community", index.vectors, () => interest.centroids.content);
  const picks = new Map<string, SocialPick>();
  for (const candidate of candidates) {
    const fans = kindred.get(candidate.id) ?? 0;
    const sem = semantic.get(candidate.id);
    const activity = pop(candidate.memberCount + candidate.postCount / 4);
    const kindredScore = Math.min(1, fans / 3);
    const score = sem !== undefined ? sem * 0.5 + kindredScore * 0.3 + activity * 0.2 : kindredScore * 0.6 + activity * 0.4;
    const reason = fans
      ? `${fans} member${fans === 1 ? "" : "s"} love${fans === 1 ? "s" : ""} what you love`
      : sem !== undefined && sem >= 0.7
        ? `Fits your taste · ${candidate.category}`
        : `Active ${candidate.category} fans · ${candidate.memberCount} members`;
    picks.set(candidate.id, { id: candidate.id, score, reason });
  }
  return picks;
}
