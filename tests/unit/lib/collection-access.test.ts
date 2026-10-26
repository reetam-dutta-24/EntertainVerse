import { describe, expect, it } from "vitest";
import { canEditCollectionItems, canViewCollection } from "@/lib/collection-access";

const row = (visibility: string) => ({
  userId: "owner",
  visibility,
  collaborators: [
    { userId: "editor", role: "editor" },
    { userId: "viewer", role: "viewer" },
  ],
});

describe("canViewCollection", () => {
  it("opens public collections to everyone, guests included", () => {
    expect(canViewCollection(row("PUBLIC"))).toBe(true);
    expect(canViewCollection(row("PUBLIC"), "stranger")).toBe(true);
  });

  it.each(["owner", "editor", "viewer"])("lets %s see a private collection", (viewer) => {
    expect(canViewCollection(row("PRIVATE"), viewer)).toBe(true);
  });

  it.each([undefined, "stranger"])("hides a private collection from %s", (viewer) => {
    expect(canViewCollection(row("PRIVATE"), viewer)).toBe(false);
  });
});

describe("canEditCollectionItems", () => {
  it.each([
    ["owner", true],
    ["editor", true],
    ["viewer", false],
    ["stranger", false],
    [undefined, false],
  ])("%s → %s", (viewer, expected) => {
    expect(canEditCollectionItems(row("PUBLIC"), viewer)).toBe(expected);
  });
});
