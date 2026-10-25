import { expect, test } from "@playwright/test";
import { DEMO_STATE, DEMO_USER, expectOnDashboard, newAccount, signIn } from "./support/auth";

test.describe("signed out", () => {
  test("sends guests from the dashboard to login, then back where they were going", async ({ page }) => {
    await page.goto("/dashboard/watchlist");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Fwatchlist/);

    await page.getByPlaceholder("Email or Username").fill(DEMO_USER.email);
    await page.getByPlaceholder("Password").fill(DEMO_USER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/watchlist$/);
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
    await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example%2Fphish");
    await page.getByPlaceholder("Email or Username").fill(DEMO_USER.email);
    await page.getByPlaceholder("Password").fill(DEMO_USER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expectOnDashboard(page);
  });

  test("signs up a new account and starts onboarding", async ({ page }) => {
    const account = newAccount();
    await page.goto("/signup");
    await page.getByPlaceholder("Full name").fill(account.fullName);
    await page.getByPlaceholder("Username").fill(account.username);
    await page.getByPlaceholder("Email address").fill(account.email);
    await page.getByPlaceholder("Password", { exact: true }).fill(account.password);
    await page.getByPlaceholder("Confirm password").fill(account.password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /create account|sign up/i }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    // Not onboarded yet: the dashboard sends them back.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("refuses a signup with an email that's already registered", async ({ page }) => {
    const account = newAccount();
    await page.goto("/signup");
    await page.getByPlaceholder("Full name").fill(account.fullName);
    await page.getByPlaceholder("Username").fill(account.username);
    await page.getByPlaceholder("Email address").fill(DEMO_USER.email);
    await page.getByPlaceholder("Password", { exact: true }).fill(account.password);
    await page.getByPlaceholder("Confirm password").fill(account.password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /create account|sign up/i }).click();

    await expect(page.getByText(/already/i)).toBeVisible();
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
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).not.toHaveURL(/\/dashboard/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
