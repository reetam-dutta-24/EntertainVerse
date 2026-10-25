import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validators/auth";
import { imageUrlField } from "@/lib/validators/image-url";
import { reviewFormSchema, reviewUpdateSchema } from "@/lib/validators/review";

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message;

describe("registerSchema", () => {
  const valid = { fullName: "Reetam Dutta", username: "reetam_24", email: "  Reetam@Example.COM ", password: "secret1" };

  it("accepts a valid signup and normalises the email", () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe("reetam@example.com");
  });

  it.each([
    ["username", "ab", "Username must be at least 3 characters."],
    ["username", "has space", "Username can only contain letters, numbers, and underscores."],
    ["username", "a".repeat(31), "Username must be 30 characters or fewer."],
    ["email", "not-an-email", "Enter a valid email address."],
    ["password", "12345", "Password must be at least 6 characters."],
    ["password", "x".repeat(129), "Password is too long."],
    ["fullName", " R ", "Full name must be at least 2 characters."],
  ])("rejects %s %j", (field, value, message) => {
    expect(firstError(registerSchema.safeParse({ ...valid, [field]: value }))).toBe(message);
  });
});

describe("loginSchema", () => {
  it("requires an identifier", () => {
    expect(firstError(loginSchema.safeParse({ identifier: "   ", password: "secret1" }))).toBe("Email or username is required.");
    expect(loginSchema.safeParse({ identifier: "reetam", password: "secret1" }).success).toBe(true);
  });
});

describe("review schemas", () => {
  it("coerces the rating from form data and bounds it to 0–10", () => {
    expect(reviewFormSchema.parse({ rating: "8.5", body: "Great" }).rating).toBe(8.5);
    expect(reviewFormSchema.safeParse({ rating: "11", body: "Great" }).success).toBe(false);
    expect(reviewFormSchema.safeParse({ rating: "-1", body: "Great" }).success).toBe(false);
  });

  it("requires a non-blank body", () => {
    expect(firstError(reviewFormSchema.safeParse({ rating: 7, body: "   " }))).toBe("Write your review.");
  });

  it("allows an empty headline", () => {
    expect(reviewFormSchema.safeParse({ rating: 7, headline: "", body: "Good" }).success).toBe(true);
  });

  it("lets updates change any subset of fields", () => {
    expect(reviewUpdateSchema.safeParse({}).success).toBe(true);
    expect(reviewUpdateSchema.safeParse({ body: "" }).success).toBe(false);
  });
});

describe("imageUrlField", () => {
  it.each(["", "https://cdn.example.com/a.jpg", "http://x.io/a.png", "/uploads/posters/a.webp", undefined])("accepts %j", (value) => {
    expect(imageUrlField.safeParse(value).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "ftp://x.io/a.png", "uploads/a.png", "/path with space.png", "/a.png?x=1", `https://x.io/${"a".repeat(500)}`])(
    "rejects %j",
    (value) => {
      expect(imageUrlField.safeParse(value).success).toBe(false);
    },
  );
});
