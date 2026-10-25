import { expect, type Page } from "@playwright/test";
import { DEMO_USER } from "../../../lib/seed/generate-catalog";

export { DEMO_USER };

/** Saved session of the seeded demo user (written by auth.setup.ts). */
export const DEMO_STATE = "tests/e2e/.auth/demo.json";

export async function signIn(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email or Username").fill(identifier);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** A unique, valid signup for tests that create accounts. */
export function newAccount() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { fullName: "E2E Tester", username: `e2e_${id}`, email: `e2e_${id}@test.local`, password: "Passw0rd!e2e" };
}

export async function expectOnDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByText(/Welcome back,/)).toBeVisible();
}
