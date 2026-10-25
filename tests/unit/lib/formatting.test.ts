import { describe, expect, it } from "vitest";
import { formatChatSentAt, formatRelativeTime } from "@/lib/format-dates";
import { formatRating, roundRating } from "@/lib/format-rating";
import { slugify } from "@/lib/slugify";

describe("slugify", () => {
  it.each([
    ["Attack on Titan", "attack-on-titan"],
    ["  Frieren: Beyond Journey's End  ", "frieren-beyond-journey-s-end"],
    ["--Re:Zero--", "re-zero"],
    ["Spy×Family", "spy-family"],
    ["!!!", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("ratings", () => {
  it("rounds to one decimal", () => {
    expect(roundRating(8.84)).toBe(8.8);
    expect(roundRating(7.25)).toBe(7.3);
    expect(roundRating(10)).toBe(10);
  });

  it("treats missing values as no rating", () => {
    expect(roundRating(null)).toBeNull();
    expect(roundRating(undefined)).toBeNull();
    expect(roundRating(Number.NaN)).toBeNull();
    expect(formatRating(null)).toBe("—");
  });

  it("always shows one decimal place", () => {
    expect(formatRating(9)).toBe("9.0");
    expect(formatRating(0)).toBe("0.0");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-05-10T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;

  it.each([
    [30_000, "Just now"],
    [MIN, "1 min ago"],
    [59 * MIN, "59 min ago"],
    [60 * MIN, "1 hr ago"],
    [5 * 60 * MIN, "5 hrs ago"],
    [24 * 60 * MIN, "1 day ago"],
    [6 * 24 * 60 * MIN, "6 days ago"],
  ])("%i ms ago → %s", (ms, label) => {
    expect(formatRelativeTime(ago(ms), now)).toBe(label);
  });

  it("switches to a date after a week", () => {
    expect(formatRelativeTime(new Date("2026-04-01T12:00:00Z"), now)).toBe("1 Apr 2026");
  });

  it("shows a just-sent chat message as 'Just now'", () => {
    expect(formatChatSentAt(ago(10_000), now)).toBe("Just now");
    expect(formatChatSentAt(ago(5 * MIN), now)).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/);
  });
});
