import { describe, expect, it } from "vitest";
import { applyCollectionListFilters, matchesCollectionGenre } from "@/lib/collection-list-utils";
import { applyCommunityListFilters, sortCommunities } from "@/lib/community-list-utils";
import type { Collection, Community } from "@/types";

const community = (id: string, fields: Partial<Community>): Community => ({
  id,
  name: id,
  category: "Anime",
  memberCount: 0,
  postCount: 0,
  visibility: "PUBLIC" as Community["visibility"],
  activityLevel: "LOW" as Community["activityLevel"],
  ...fields,
});

const collection = (id: string, fields: Partial<Collection>): Collection => ({
  id,
  name: id,
  itemCount: 0,
  favoriteCount: 0,
  visibility: "PUBLIC" as Collection["visibility"],
  ...fields,
});

const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe("community lists", () => {
  const list = [
    community("b", { name: "Bravo", category: "Anime", memberCount: 5, createdAtTime: 1, updatedAtTime: 30 }),
    community("a", { name: "alpha", category: "K-Drama", memberCount: 50, createdAtTime: 3, updatedAtTime: 10 }),
    community("c", { name: "Charlie", category: "anime", memberCount: 20, createdAtTime: 2 }),
  ];

  it.each([
    ["Alphabetical", ["a", "b", "c"]],
    ["Largest", ["a", "c", "b"]],
    ["Newest", ["a", "c", "b"]],
    ["Recently Updated", ["b", "a", "c"]],
  ] as const)("sorts by %s", (sort, expected) => {
    expect(ids(sortCommunities(list, sort))).toEqual(expected);
  });

  it("filters by category case-insensitively, 'All' keeps everything", () => {
    expect(ids(applyCommunityListFilters(list, "ANIME", "Alphabetical"))).toEqual(["b", "c"]);
    expect(applyCommunityListFilters(list, "All", "Alphabetical")).toHaveLength(3);
  });

  it("doesn't reorder the input", () => {
    const before = ids(list);
    sortCommunities(list, "Largest");
    expect(ids(list)).toEqual(before);
  });
});

describe("collection lists", () => {
  it("matches by category, genre label, or the music kind", () => {
    expect(matchesCollectionGenre(collection("x", { category: "Anime" }), "anime")).toBe(true);
    expect(matchesCollectionGenre(collection("x", { genreLabelIds: ["Romance"] }), "romance")).toBe(true);
    expect(matchesCollectionGenre(collection("x", { collectionKind: "music" }), "Music")).toBe(true);
    expect(matchesCollectionGenre(collection("x", { category: "Anime" }), "Music")).toBe(false);
    expect(matchesCollectionGenre(collection("x", {}), "Horror")).toBe(false);
  });

  it("filters then sorts by size", () => {
    const list = [
      collection("small", { category: "Anime", itemCount: 2 }),
      collection("big", { category: "Anime", itemCount: 40 }),
      collection("other", { category: "Movies", itemCount: 99 }),
    ];
    expect(ids(applyCollectionListFilters(list, "Anime", "Largest"))).toEqual(["big", "small"]);
  });
});
