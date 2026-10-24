import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { centroid, dot, embeddingKey, type EmbeddingIndex, type EmbeddingKind, type Vector } from "@/lib/recommender/embeddings";

/**
 * Hybrid recommender pieces layered on the taste engine:
 *  - semantic:      cosine similarity between a candidate and the user's taste
 *                   centroid in embedding space (pre-trained deep model)
 *  - collaborative: item-item co-occurrence across all users ("fans of X also…")
 *  - explanations:  the anchor item and shared traits behind each pick
 */

/** Something the user has shown interest in — the basis for "Because you…". */
export interface Anchor {
  kind: EmbeddingKind;
  slug: string;
  title: string;
  /** "loved", "watched", "picked", "saved", "played", "follow". */
  verb: string;
  weight: number;
  vector: Vector | null;
}

export interface AnchorInput {
  kind: EmbeddingKind;
  itemId: string;
  slug: string;
  title: string;
  verb: string;
  weight: number;
}

/** Merge duplicate anchors (keep the strongest reason) and attach vectors. */
export function buildAnchors(index: EmbeddingIndex, inputs: AnchorInput[]): Anchor[] {
  const bySlug = new Map<string, AnchorInput>();
  for (const input of inputs) {
    const key = `${input.kind}:${input.slug}`;
    const current = bySlug.get(key);
    if (!current || input.weight > current.weight) bySlug.set(key, input);
  }
  return [...bySlug.values()].map((input) => ({
    kind: input.kind,
    slug: input.slug,
    title: input.title,
    verb: input.verb,
    weight: input.weight,
    vector: index.vectors.get(embeddingKey(input.kind, input.itemId)) ?? null,
  }));
}

export function tasteCentroid(anchors: Anchor[]): Vector | null {
  return centroid(anchors.flatMap((a) => (a.vector ? [{ vector: a.vector, weight: a.weight }] : [])));
}

/** Rescale scores to 0–1 across the candidate pool (cosines cluster in a narrow band). */
export function minMax(values: Map<string, number>): Map<string, number> {
  if (!values.size) return values;
  const all = [...values.values()];
  const min = Math.min(...all);
  const span = Math.max(...all) - min || 1;
  return new Map([...values].map(([key, value]) => [key, (value - min) / span]));
}

/** Closest anchor to a candidate in embedding space. */
export function closestAnchor(vector: Vector | undefined, anchors: Anchor[], excludeSlug: string) {
  if (!vector) return null;
  let best: { anchor: Anchor; similarity: number } | null = null;
  for (const anchor of anchors) {
    if (!anchor.vector || anchor.slug === excludeSlug) continue;
    const similarity = dot(vector, anchor.vector);
    if (!best || similarity > best.similarity) best = { anchor, similarity };
  }
  return best;
}

/**
 * Cosine similarity of gemini-embedding-001 vectors for clearly related titles
 * sits around 0.78+; unrelated ones around 0.65–0.72.
 */
export const RELATED_SIMILARITY = 0.78;

/** Who interacted with what, across every user (favorites, ≥20 min watched, ratings ≥7, listens). */
export const loadInteractionGraph = cache(async () => {
  const since = new Date(Date.now() - 365 * 86_400_000);
  const [favorites, watches, ratings, trackFavorites, listens] = await Promise.all([
    prisma.contentFavorite.findMany({ select: { userId: true, content: { select: { slug: true } } } }),
    prisma.watchEvent.groupBy({ by: ["userId", "contentId"], where: { watchedAt: { gte: since } }, _sum: { minutes: true } }),
    prisma.rating.findMany({ where: { score: { gte: 7 } }, select: { userId: true, content: { select: { slug: true } } } }),
    prisma.trackFavorite.findMany({ select: { userId: true, track: { select: { slug: true } } } }),
    prisma.listenEvent.groupBy({ by: ["userId", "trackId"], where: { listenedAt: { gte: since } }, _sum: { minutes: true } }),
  ]);

  const [contentSlugs, trackSlugs] = await Promise.all([
    prisma.content.findMany({ where: { id: { in: watches.map((w) => w.contentId) } }, select: { id: true, slug: true } }),
    prisma.musicTrack.findMany({ where: { id: { in: listens.map((l) => l.trackId) } }, select: { id: true, slug: true } }),
  ]);
  const contentSlug = new Map(contentSlugs.map((row) => [row.id, row.slug]));
  const trackSlug = new Map(trackSlugs.map((row) => [row.id, row.slug]));

  const content = new Map<string, Set<string>>();
  const tracks = new Map<string, Set<string>>();
  const add = (graph: Map<string, Set<string>>, slug: string | undefined, userId: string) => {
    if (!slug) return;
    if (!graph.has(slug)) graph.set(slug, new Set());
    graph.get(slug)!.add(userId);
  };
  for (const row of favorites) add(content, row.content.slug, row.userId);
  for (const row of ratings) add(content, row.content.slug, row.userId);
  for (const row of watches) if ((row._sum.minutes ?? 0) >= 20) add(content, contentSlug.get(row.contentId), row.userId);
  for (const row of trackFavorites) add(tracks, row.track.slug, row.userId);
  for (const row of listens) if ((row._sum.minutes ?? 0) >= 3) add(tracks, trackSlug.get(row.trackId), row.userId);
  return { content, tracks };
});

/**
 * Item-item collaborative score: for each candidate, how strongly other users
 * who liked the anchors also liked it (cosine over co-occurrence, self excluded).
 */
export function coOccurrence(anchors: Anchor[], graph: Map<string, Set<string>>, selfId?: string) {
  const others = (slug: string) => {
    const users = graph.get(slug);
    if (!users) return null;
    if (!selfId || !users.has(selfId)) return users;
    const copy = new Set(users);
    copy.delete(selfId);
    return copy;
  };
  /** `via` is the anchor that contributed most — used for "Fans of X also…". */
  const scores = new Map<string, { score: number; via: Anchor; best: number }>();
  const totalWeight = anchors.reduce((sum, a) => sum + a.weight, 0) || 1;

  for (const anchor of anchors) {
    const anchorUsers = others(anchor.slug);
    if (!anchorUsers?.size) continue;
    for (const [slug] of graph) {
      if (slug === anchor.slug) continue;
      const users = others(slug);
      if (!users?.size) continue;
      let shared = 0;
      for (const user of anchorUsers) if (users.has(user)) shared++;
      if (!shared) continue;
      const similarity = shared / Math.sqrt(anchorUsers.size * users.size);
      const contribution = (anchor.weight * similarity) / totalWeight;
      const current = scores.get(slug);
      if (!current) {
        scores.set(slug, { score: contribution, via: anchor, best: contribution });
      } else {
        current.score += contribution;
        if (contribution > current.best) {
          current.best = contribution;
          current.via = anchor;
        }
      }
    }
  }
  return scores;
}

/** Blend weights: taste engine (explicit preferences), semantic, collaborative. */
export function blendScore(base: number, semantic: number | undefined, collaborative: number | undefined) {
  const hasSemantic = semantic !== undefined;
  const collab = collaborative ?? 0;
  return hasSemantic ? base * 0.5 + semantic * 0.35 + collab * 0.15 : base * 0.85 + collab * 0.15;
}

/** Exponential decay: an hour watched 30 days ago counts half as much as one today. */
export function decayedWeight(minutes: number, at: Date, halfLifeDays = 30) {
  const ageDays = (Date.now() - at.getTime()) / 86_400_000;
  return minutes * Math.pow(0.5, ageDays / halfLifeDays);
}
