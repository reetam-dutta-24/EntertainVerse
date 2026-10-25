import { describe, expect, it } from "vitest";
import { bestFieldScore, normalizeSearchQuery, scoreSearchMatch } from "@/lib/search/utils";

describe("normalizeSearchQuery", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeSearchQuery("  Attack   on\tTitan ")).toBe("attack on titan");
  });
});

describe("scoreSearchMatch", () => {
  it("ranks exact > prefix > substring > all words > none", () => {
    expect(scoreSearchMatch("Frieren", "frieren")).toBe(100);
    expect(scoreSearchMatch("Frieren: Beyond Journey's End", "frieren")).toBe(85);
    expect(scoreSearchMatch("Sousou no Frieren", "frieren")).toBe(70);
    expect(scoreSearchMatch("Attack on Titan", "titan attack")).toBe(65);
    expect(scoreSearchMatch("Attack on Titan", "titan naruto")).toBe(0);
  });

  it("is case- and spacing-insensitive", () => {
    expect(scoreSearchMatch("Death Note", "  DEATH   note ")).toBe(100);
  });

  it("matches nothing for a blank query", () => {
    expect(scoreSearchMatch("Anything", "   ")).toBe(0);
  });
});

describe("bestFieldScore", () => {
  it("takes the best field and skips missing ones", () => {
    expect(bestFieldScore([undefined, "Shingeki no Kyojin", "Attack on Titan"], "attack on titan")).toBe(100);
    expect(bestFieldScore([undefined, ""], "x")).toBe(0);
  });
});
