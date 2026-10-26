import { expect, test } from "@playwright/test";
import { AFTER_SIGN_IN, DEMO_STATE, DEMO_USER, expectOnDashboard, fillSignup, newAccount, signIn } from "./support/auth";

test.describe("signed out", () => {
  test("sends guests from the dashboard to login, then back where they were going", async ({ page }) => {
    await page.goto("/dashboard/watchlist");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Fwatchlist/);

    await signIn(page, DEMO_USER.email, DEMO_USER.password, "/login?callbackUrl=%2Fdashboard%2Fwatchlist");
    await expect(page).toHaveURL(/\/dashboard\/watchlist$/, AFTER_SIGN_IN);
  });

  test("signs in with a username as well as an email", async ({ page }) => {
    await signIn(page, DEMO_USER.handle, DEMO_USER.password);
    await expectOnDashboard(page);
  });

  test("rejects a wrong password and stays on login", async ({ page }) => {
    await signIn(page, DEMO_USER.email, "not-the-password");
    await expect(page.getByText("Invalid email/username or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("ignores an off-site callbackUrl (no open redirect)", async ({ page }) => {
    await signIn(page, DEMO_USER.email, DEMO_USER.password, "/login?callbackUrl=https%3A%2F%2Fevil.example%2Fphish");
    await expectOnDashboard(page);
  });

  test("signs up a new account and starts onboarding", async ({ page }) => {
    await fillSignup(page, newAccount());
    await page.getByRole("button", { name: /create account|sign up/i }).click();

    await expect(page).toHaveURL(/\/onboarding/, AFTER_SIGN_IN);
    // Not onboarded yet: the dashboard sends them back.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("refuses a signup with an email that's already registered", async ({ page }) => {
    await fillSignup(page, { ...newAccount(), email: DEMO_USER.email });
    await page.getByRole("button", { name: /create account|sign up/i }).click();

    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

});

test.describe("signed in", () => {
  test.use({ storageState: DEMO_STATE });

  test("skips the login page", async ({ page }) => {
    await page.goto("/login");
    await expectOnDashboard(page);
  });

  test("signs out from the account menu", async ({ page }) => {
    // Each test gets its own copy of the saved session, so this doesn't sign out other tests.
    await page.goto("/dashboard");
    // The sidebar and the top bar each have one; use whichever this layout shows.
    await page.getByRole("button", { name: "Account menu" }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).not.toHaveURL(/\/dashboard/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  // Regression: a dashboard request still in flight (a link prefetch — opening the account
  // menu prefetches its links) used to answer after sign-out with a fresh session cookie,
  // signing the user straight back in. The middleware now never re-issues the cookie.
  test("stays signed out when signing out while the dashboard is still loading", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "commit" });
    await page.getByRole("button", { name: "Account menu" }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).not.toHaveURL(/\/dashboard/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
