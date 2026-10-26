/**
 * Settings shared by the E2E database prep, the app server Playwright starts, and the tests.
 * The E2E app runs on its own port against its own database, so a dev server on :3000 and
 * the dev database are never touched.
 */

/**
 * `npm run test:e2e:stack`: the app runs as two servers (Docker) behind a load balancer,
 * like production — see docker-compose.e2e.yml. Otherwise one server, started by Playwright.
 */
export const E2E_STACK = process.env.E2E_STACK === "1";

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = E2E_STACK ? "http://localhost:8080" : `http://localhost:${E2E_PORT}`;

/** Each app server of the stack directly, skipping the load balancer. */
export const E2E_SERVERS = { a: "http://localhost:3201", b: "http://localhost:3202" } as const;

/** Local default matches `npm run e2e:db` (or the stack's Postgres); CI passes its service URL. */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  `postgresql://test:test@localhost:${E2E_STACK ? 55434 : 55433}/entertainverse_e2e`;

/** Environment for the app under test (overrides .env / .env.local, which Next also loads). */
export const E2E_APP_ENV: Record<string, string> = {
  DATABASE_URL: E2E_DATABASE_URL,
  PORT: String(E2E_PORT),
  HOSTNAME: "localhost",
  AUTH_URL: E2E_BASE_URL,
  NEXTAUTH_URL: E2E_BASE_URL,
  NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
  NEXT_PUBLIC_SOCKET_URL: E2E_BASE_URL,
  AUTH_SECRET: "e2e-only-secret-not-for-production-use",
  NEXTAUTH_SECRET: "e2e-only-secret-not-for-production-use",
  // The seed writes from another process; skip the in-memory cache so nothing is stale.
  SERVER_CACHE: "off",
  // No calls to paid / rate-limited services from tests.
  GEMINI_API_KEY: "",
  ANTHROPIC_API_KEY: "",
  ANTHROPIC_AUTH_TOKEN: "",
  ANTHROPIC_PROFILE: "",
  TMDB_API_KEY: "",
  TMDB_READ_ACCESS_TOKEN: "",
  AUTH_GOOGLE_ID: "",
  AUTH_GOOGLE_SECRET: "",
  AUTH_DISCORD_ID: "",
  AUTH_DISCORD_SECRET: "",
};

/** Refuse to reset anything that isn't clearly an E2E database. */
export function assertE2eDatabase(url: string) {
  const { hostname, pathname } = new URL(url);
  const database = pathname.slice(1);
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  if (!database.includes("e2e") || (!localHost && !process.env.CI)) {
    throw new Error(`Refusing to reset "${database}" on ${hostname}: E2E tests only run against a local database whose name contains "e2e".`);
  }
}
