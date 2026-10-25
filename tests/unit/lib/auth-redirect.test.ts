import { describe, expect, it } from "vitest";
import { authErrorMessage, OAUTH_EMAIL_NOT_VERIFIED, safeCallbackUrl } from "@/lib/auth-redirect";

describe("safeCallbackUrl", () => {
  it.each(["/dashboard", "/content/frieren?tab=reviews", "/profile/reetam#about"])("allows same-origin path %s", (path) => {
    expect(safeCallbackUrl(path)).toBe(path);
  });

  it.each([
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["javascript: URL", "javascript:alert(1)"],
    ["relative path", "dashboard"],
    ["empty string", ""],
  ])("rejects %s (open redirect)", (_, value) => {
    expect(safeCallbackUrl(value)).toBeUndefined();
  });

  it.each(["/login", "/signup?x=1", "/api/auth/signin"])("rejects auth route %s (redirect loop)", (path) => {
    expect(safeCallbackUrl(path)).toBeUndefined();
  });

  it("uses the first value of a repeated query param", () => {
    expect(safeCallbackUrl(["/a", "https://evil.example"])).toBe("/a");
    expect(safeCallbackUrl(["https://evil.example", "/a"])).toBeUndefined();
    expect(safeCallbackUrl(undefined)).toBeUndefined();
  });
});

describe("authErrorMessage", () => {
  it("is null without an error code", () => {
    expect(authErrorMessage(undefined)).toBeNull();
    expect(authErrorMessage("")).toBeNull();
  });

  it("maps known codes to specific copy", () => {
    expect(authErrorMessage("CredentialsSignin")).toBe("Invalid email/username or password.");
    expect(authErrorMessage(OAUTH_EMAIL_NOT_VERIFIED)).toMatch(/isn't verified/);
    expect(authErrorMessage(["AccessDenied"])).toMatch(/cancelled or denied/);
  });

  it("falls back to generic copy for unknown codes", () => {
    expect(authErrorMessage("SomethingNew")).toMatch(/Something went wrong/);
  });
});
