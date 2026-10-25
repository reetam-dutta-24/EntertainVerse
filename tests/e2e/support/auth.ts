import { expect, type Page } from "@playwright/test";
import { DEMO_USER } from "../../../lib/seed/generate-catalog";

export { DEMO_USER };

/** Saved session of the seeded demo user (written by auth.setup.ts). */
export const DEMO_STATE = "tests/e2e/.auth/demo.json";

/**
 * Open /login or /signup and wait until the form is the hydrated one. The page streams in:
 * for a moment a hidden copy of the form sits next to the visible one, and typing before
 * React hydrates would submit the form natively instead of through signIn().
 */
export async function openAuthPage(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.locator('input[name="password"]')).toHaveCount(1);
}

export async function signIn(page: Page, identifier: string, password: string, path = "/login") {
  await openAuthPage(page, path);
  await page.getByPlaceholder("Email or Username").fill(identifier);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** A unique, valid signup for tests that create accounts. */
export function newAccount() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { fullName: "E2E Tester", username: `e2e_${id}`, email: `e2e_${id}@test.local`, password: "Passw0rd!e2e" };
}

export async function fillSignup(page: Page, account: ReturnType<typeof newAccount>) {
  await openAuthPage(page, "/signup");
  await page.getByPlaceholder("Full name").fill(account.fullName);
  await page.getByPlaceholder("Username").fill(account.username);
  await page.getByPlaceholder("Email address").fill(account.email);
  await page.getByPlaceholder("Password", { exact: true }).fill(account.password);
  await page.getByPlaceholder("Confirm password").fill(account.password);
  await page.getByRole("checkbox").check();
}

/**
 * Signing in checks a bcrypt hash and then renders the dashboard uncached — several seconds
 * when many tests sign in at once, so allow longer than the default 10s for that redirect.
 */
export const AFTER_SIGN_IN = { timeout: 30_000 };

export async function expectOnDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/?$/, AFTER_SIGN_IN);
  await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible();
}
