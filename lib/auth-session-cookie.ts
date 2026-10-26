/**
 * Auth.js re-encodes the JWT and sends a fresh session cookie on every session read.
 * Done in middleware, that races sign-out: a dashboard prefetch still in flight can answer
 * after the sign-out response and quietly put the cookie back.
 *
 * The middleware therefore only *reads* the session. Sessions still slide — SessionProvider
 * refreshes the cookie through /api/auth/session on mount and window focus.
 */

/** Matches `authjs.session-token`, its `__Secure-` form, and chunked `.0`, `.1`… parts. */
const SESSION_COOKIE = /^(?:__Secure-|__Host-)?(?:authjs|next-auth)\.session-token(?:\.\d+)?$/;

function isSessionReissue(setCookie: string) {
  const [pair] = setCookie.split(";");
  const eq = pair.indexOf("=");
  if (eq === -1) return false;
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  // Deletions (empty value) still pass, so an invalid token is cleared as before.
  return SESSION_COOKIE.test(name) && value !== "";
}

/** Removes re-issued session cookies from a response, keeping every other cookie. */
export function withoutSessionReissue(response: Response): Response {
  const cookies = response.headers.getSetCookie();
  const kept = cookies.filter((cookie) => !isSessionReissue(cookie));
  if (kept.length === cookies.length) return response;

  response.headers.delete("set-cookie");
  for (const cookie of kept) response.headers.append("set-cookie", cookie);
  return response;
}
