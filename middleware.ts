import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { withoutSessionReissue } from "@/lib/auth-session-cookie";

/**
 * Minimal middleware — Edge-safe, no Prisma, no redirect loops.
 *
 * Only job: block guests from /dashboard and /onboarding.
 * All other redirects (landing → app, login → dashboard, etc.)
 * happen in server pages via lib/auth-guards.ts (reads DB reliably).
 */
const guard = auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (req.auth) return;

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin")
  ) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
}) as unknown as NextMiddleware; // typed as a route handler; at runtime it is middleware

// Read the session here, never re-issue it — see lib/auth-session-cookie.ts.
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const response = await guard(req, event);
  return response ? withoutSessionReissue(response) : response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding", "/admin/:path*"],
};
