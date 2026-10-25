import { describe, expect, it } from "vitest";
import { pageItems } from "@/lib/carousel-pages";

const items = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("pageItems", () => {
  it("splits evenly divisible lists into full pages", () => {
    expect(pageItems(items(6), 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it("fills the last page with the final items instead of leaving it half empty", () => {
    expect(pageItems(items(8), 7)).toEqual([
      [1, 2, 3, 4, 5, 6, 7],
      [2, 3, 4, 5, 6, 7, 8],
    ]);
    expect(pageItems(items(10), 4).at(-1)).toEqual([7, 8, 9, 10]);
  });

  it("keeps a single short page as is", () => {
    expect(pageItems(items(3), 7)).toEqual([[1, 2, 3]]);
  });

  it("returns one empty page for no items", () => {
    expect(pageItems([], 5)).toEqual([[]]);
  });
});
