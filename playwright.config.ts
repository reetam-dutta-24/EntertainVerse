import { defineConfig, devices } from "@playwright/test";
import { E2E_APP_ENV, E2E_BASE_URL } from "./tests/e2e/support/env";

const CI = Boolean(process.env.CI);

/**
 * E2E tests run against a production build (`next build` + the custom Socket.IO server),
 * the same thing that's deployed. Reset the database first: `npm run test:e2e` does both.
 */
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
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
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"], testIgnore: /.*\.mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, dependencies: ["setup"], testMatch: /.*\.mobile\.spec\.ts/ },
  ],
  webServer: {
    command: "npm run build && npx tsx server.ts",
    url: `${E2E_BASE_URL}/login`,
    env: { ...E2E_APP_ENV, NODE_ENV: "production" },
    reuseExistingServer: !CI,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
