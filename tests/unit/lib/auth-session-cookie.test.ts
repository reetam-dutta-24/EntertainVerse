import { describe, expect, it } from "vitest";
import { withoutSessionReissue } from "@/lib/auth-session-cookie";

function responseWith(cookies: string[]) {
  const response = new Response(null);
  for (const cookie of cookies) response.headers.append("set-cookie", cookie);
  return response;
}

describe("withoutSessionReissue", () => {
  it.each([
    "authjs.session-token=eyJhbGciOi; Path=/; HttpOnly; SameSite=Lax",
    "__Secure-authjs.session-token=eyJhbGciOi; Path=/; HttpOnly; Secure",
    "__Secure-authjs.session-token.0=eyJhbGciOi; Path=/; HttpOnly; Secure",
  ])("drops a re-issued session cookie: %s", (cookie) => {
    expect(withoutSessionReissue(responseWith([cookie])).headers.getSetCookie()).toEqual([]);
  });

  it("keeps session deletions so invalid tokens are still cleared", () => {
    const deletion = "authjs.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    expect(withoutSessionReissue(responseWith([deletion])).headers.getSetCookie()).toEqual([deletion]);
  });

  it("keeps unrelated cookies", () => {
    const response = withoutSessionReissue(
      responseWith(["authjs.session-token=abc; Path=/", "theme=dark; Path=/", "authjs.csrf-token=xyz; Path=/"]),
    );
    expect(response.headers.getSetCookie()).toEqual(["theme=dark; Path=/", "authjs.csrf-token=xyz; Path=/"]);
  });

  it("leaves a response without cookies untouched", () => {
    const response = new Response("ok", { headers: { "x-test": "1" } });
    expect(withoutSessionReissue(response)).toBe(response);
    expect(response.headers.get("x-test")).toBe("1");
  });
});
