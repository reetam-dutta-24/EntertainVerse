import { describe, expect, it } from "vitest";
import { generateJoinCode, hashJoinCode, joinCodeLookup, normalizeJoinCode, verifyJoinCode } from "@/lib/community-join-code";

describe("join codes", () => {
  it("generates ROOM- codes without look-alike characters (0/O, 1/I)", () => {
    for (let i = 0; i < 200; i++) expect(generateJoinCode()).toMatch(/^ROOM-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("generates different codes", () => {
    expect(new Set(Array.from({ length: 50 }, generateJoinCode)).size).toBe(50);
  });

  it("normalises what people type", () => {
    expect(normalizeJoinCode("  room- ab c12 ")).toBe("ROOM-ABC12");
  });

  it("derives a stable lookup key", () => {
    expect(joinCodeLookup("ROOM-ABC234")).toBe(joinCodeLookup("ROOM-ABC234"));
    expect(joinCodeLookup("ROOM-ABC234")).not.toBe(joinCodeLookup("ROOM-ABC235"));
    expect(joinCodeLookup("ROOM-ABC234")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies only the code that was hashed", async () => {
    const hash = await hashJoinCode("ROOM-ABC234");
    expect(hash).not.toContain("ABC234");
    await expect(verifyJoinCode("ROOM-ABC234", hash)).resolves.toBe(true);
    await expect(verifyJoinCode("ROOM-ABC235", hash)).resolves.toBe(false);
  });
});
