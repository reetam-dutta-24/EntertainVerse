import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { centroid, dot, embeddingKey } = await import("@/lib/recommender/embeddings");
const { answersAnchor, blendScore, buildAnchors, closestAnchor, coOccurrence, decayedWeight, minMax, tasteCentroid, topShareCutoff } =
  await import("@/lib/recommender/hybrid");
type Anchor = import("@/lib/recommender/hybrid").Anchor;

const vec = (...values: number[]) => Float32Array.from(values);
const unit = (...values: number[]) => {
  const norm = Math.hypot(...values);
  return vec(...values.map((value) => value / norm));
};
const anchor = (slug: string, weight: number, vector: Float32Array | null = null, extra: Partial<Anchor> = {}): Anchor => ({
  kind: "content",
  slug,
  title: slug,
  verb: "loved",
  weight,
  vector,
  ...extra,
});

describe("embedding math", () => {
  it("dot is the cosine for unit vectors", () => {
    expect(dot(unit(1, 0), unit(1, 0))).toBeCloseTo(1);
    expect(dot(unit(1, 0), unit(0, 1))).toBeCloseTo(0);
    expect(dot(unit(1, 1), unit(1, 0))).toBeCloseTo(Math.SQRT1_2);
  });

  it("centroid is the normalised weighted mean, ignoring non-positive weights", () => {
    const result = centroid([
      { vector: vec(1, 0), weight: 3 },
      { vector: vec(0, 1), weight: 1 },
      { vector: vec(0, 1), weight: 0 },
    ])!;
    expect(Math.hypot(...result)).toBeCloseTo(1);
    expect(result[0]! / result[1]!).toBeCloseTo(3);
  });

  it("centroid is null with nothing usable", () => {
    expect(centroid([])).toBeNull();
    expect(centroid([{ vector: vec(1, 0), weight: 0 }])).toBeNull();
  });
});

describe("buildAnchors", () => {
  it("merges duplicates, keeping the strongest reason, and attaches vectors", () => {
    const vectors = new Map([[embeddingKey("content", "id-1"), unit(1, 0)]]);
    const anchors = buildAnchors({ vectors } as never, [
      { kind: "content", itemId: "id-1", slug: "frieren", title: "Frieren", verb: "watched", weight: 0.4 },
      { kind: "content", itemId: "id-1", slug: "frieren", title: "Frieren", verb: "loved", weight: 1 },
      { kind: "track", itemId: "id-2", slug: "frieren", title: "Frieren OST", verb: "played", weight: 0.3 },
    ]);
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toMatchObject({ slug: "frieren", verb: "loved", weight: 1 });
    expect(anchors[0]!.vector).toEqual(unit(1, 0));
    expect(anchors[1]).toMatchObject({ kind: "track", vector: null });
  });

  it("tasteCentroid skips anchors without vectors", () => {
    expect(tasteCentroid([anchor("a", 1)])).toBeNull();
    expect(tasteCentroid([anchor("a", 1, unit(1, 0)), anchor("b", 1)])).toEqual(unit(1, 0));
  });
});

describe("minMax", () => {
  it("rescales to 0–1", () => {
    expect([...minMax(new Map([["a", 0.7], ["b", 0.8], ["c", 0.75]])).values()].map((v) => +v.toFixed(6))).toEqual([0, 1, 0.5]);
  });

  it("maps a flat pool to 0 rather than dividing by zero", () => {
    expect([...minMax(new Map([["a", 0.5], ["b", 0.5]])).values()]).toEqual([0, 0]);
    expect(minMax(new Map()).size).toBe(0);
  });
});

describe("closestAnchor", () => {
  const anchors = [
    anchor("near", 1, unit(1, 0.1)),
    anchor("far", 1, unit(0, 1)),
    anchor("answers", 1, unit(1, 0), { reason: "Fits your vibe" }),
  ];

  it("picks the most similar anchor, skipping the candidate itself and the answers pseudo-anchor", () => {
    expect(closestAnchor(unit(1, 0), anchors, "x")?.anchor.slug).toBe("near");
    expect(closestAnchor(unit(1, 0), anchors, "near")?.anchor.slug).toBe("far");
  });

  it("returns null without a vector", () => {
    expect(closestAnchor(undefined, anchors, "x")).toBeNull();
  });
});

describe("topShareCutoff", () => {
  it("returns the similarity at the top share of the pool", () => {
    const target = vec(1);
    const pool = Array.from({ length: 20 }, (_, i) => vec(i / 20));
    // Top 15% of 20 = 3 items → the 3rd best similarity.
    expect(topShareCutoff(target, pool)).toBeCloseTo(17 / 20);
  });

  it("never matches anything with an empty pool", () => {
    expect(topShareCutoff(vec(1), [])).toBe(Infinity);
  });
});

describe("answersAnchor", () => {
  it("normalises the vector and marks the anchor with its reason", () => {
    const result = answersAnchor("content", [3, 4], "Fits your vibe")!;
    expect(result.vector).toEqual(vec(0.6, 0.8));
    expect(result).toMatchObject({ slug: "__answers", reason: "Fits your vibe", weight: 0.9 });
  });

  it("is null for an empty vector", () => {
    expect(answersAnchor("content", [], "x")).toBeNull();
  });
});

describe("coOccurrence", () => {
  const graph = new Map([
    ["frieren", new Set(["me", "u1", "u2", "u3"])],
    ["mushishi", new Set(["u1", "u2"])],
    ["berserk", new Set(["u3", "u4"])],
    ["unrelated", new Set(["u9"])],
  ]);

  it("scores items by cosine over shared fans and names the anchor that drove it", () => {
    const scores = coOccurrence([anchor("frieren", 1)], graph, "me");
    // Excluding "me": frieren has {u1,u2,u3}; mushishi shares 2 of 2, berserk 1 of 2.
    expect(scores.get("mushishi")!.score).toBeCloseTo(2 / Math.sqrt(3 * 2));
    expect(scores.get("berserk")!.score).toBeCloseTo(1 / Math.sqrt(3 * 2));
    expect(scores.get("mushishi")!.via.slug).toBe("frieren");
    expect(scores.has("unrelated")).toBe(false);
    expect(scores.has("frieren")).toBe(false);
  });

  it("excludes the user themself from the evidence", () => {
    const solo = new Map([
      ["a", new Set(["me"])],
      ["b", new Set(["me"])],
    ]);
    expect(coOccurrence([anchor("a", 1)], solo, "me").size).toBe(0);
  });

  it("weights contributions by anchor weight and keeps the strongest as `via`", () => {
    const scores = coOccurrence([anchor("mushishi", 3), anchor("berserk", 1)], graph);
    const frieren = scores.get("frieren")!;
    expect(frieren.via.slug).toBe("mushishi");
    const expected = (3 * (2 / Math.sqrt(2 * 4)) + 1 * (1 / Math.sqrt(2 * 4))) / 4;
    expect(frieren.score).toBeCloseTo(expected);
  });
});

describe("blendScore", () => {
  it("blends taste, semantic and collaborative 50/35/15", () => {
    expect(blendScore(1, 1, 1)).toBeCloseTo(1);
    expect(blendScore(0.4, 0.6, 0.2)).toBeCloseTo(0.2 + 0.21 + 0.03);
  });

  it("falls back to 85/15 without a semantic score", () => {
    expect(blendScore(1, undefined, undefined)).toBeCloseTo(0.85);
    expect(blendScore(0.5, undefined, 1)).toBeCloseTo(0.575);
  });
});

describe("decayedWeight", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("halves every 30 days", () => {
    vi.useFakeTimers({ now: new Date("2026-03-01T00:00:00Z") });
    const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
    expect(decayedWeight(60, daysAgo(0))).toBeCloseTo(60);
    expect(decayedWeight(60, daysAgo(30))).toBeCloseTo(30);
    expect(decayedWeight(60, daysAgo(60))).toBeCloseTo(15);
    expect(decayedWeight(60, daysAgo(7), 7)).toBeCloseTo(30);
  });
});
