import { defineConfig, devices } from "@playwright/test";
import { E2E_APP_ENV, E2E_BASE_URL, E2E_STACK } from "./tests/e2e/support/env";

const CI = Boolean(process.env.CI);

/**
 * E2E tests run against a production build (`next build` + the custom Socket.IO server),
 * the same thing that's deployed. Reset the database first: `npm run test:e2e` does both.
 * `npm run test:e2e:stack` runs them against two servers behind a load balancer instead.
 */
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: CI,
  // The stack (six containers) shares this machine with the browsers: freshly booted servers
  // under load occasionally miss a 30s deadline, so give each test one more go there.
  retries: CI ? 2 : E2E_STACK ? 1 : 0,
  // The app server runs on the same machine; more workers just starve it of CPU.
  workers: CI || E2E_STACK ? 2 : 4,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Signs the demo user in once; tests that need a session reuse it.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"], testIgnore: [/.*\.mobile\.spec\.ts/, /.*\.stack\.spec\.ts/] },
    { name: "mobile", use: { ...devices["Pixel 7"] }, dependencies: ["setup"], testMatch: /.*\.mobile\.spec\.ts/ },
    ...(E2E_STACK
      ? [
          // Users on different servers: realtime, uploads and caches must still agree.
          { name: "multi-server", testMatch: /multi-server\.stack\.spec\.ts/ },
          // Stops a server, so it runs last, after everything else is done with it.
          { name: "failover", testMatch: /failover\.stack\.spec\.ts/, dependencies: ["desktop", "mobile", "multi-server"] },
        ]
      : []),
  ],
  // The stack is already running (docker compose); otherwise build and start one server.
  webServer: E2E_STACK ? undefined : {
    command: "npm run build && npx tsx server.ts",
    url: `${E2E_BASE_URL}/login`,
    env: { ...E2E_APP_ENV, NODE_ENV: "production" },
    reuseExistingServer: !CI,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
