import { expect, test, type Page } from "@playwright/test";
import { DEMO_STATE } from "./support/auth";

/** AGENTS.md: every page must work from 320px phones up — no sideways scrolling. */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page is wider than the viewport").toBeLessThanOrEqual(1);
}

const PUBLIC_PAGES = ["/", "/login", "/signup"];
const APP_PAGES = ["/dashboard", "/dashboard/discover", "/dashboard/watchlist", "/dashboard/collections", "/dashboard/community"];

for (const width of [320, 412]) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const path of PUBLIC_PAGES) {
      test(`${path} fits the screen`, async ({ page }) => {
        await page.goto(path);
        await expectNoHorizontalScroll(page);
      });
    }

    test.describe("signed in", () => {
      test.use({ storageState: DEMO_STATE });

      for (const path of APP_PAGES) {
        test(`${path} fits the screen and uses the bottom nav`, async ({ page }) => {
          await page.goto(path);
          await expect(page.getByRole("navigation", { name: "Dashboard navigation" })).toBeVisible();
          await expectNoHorizontalScroll(page);
        });
      }
    });
  });
}

test.describe("navigation on a phone", () => {
  test.use({ storageState: DEMO_STATE });

  test("bottom nav moves between sections", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "Dashboard navigation" });
    await nav.getByRole("link", { name: "Watchlist" }).click();
    await expect(page).toHaveURL(/\/dashboard\/watchlist$/);
    await nav.getByRole("link", { name: "Collections" }).click();
    await expect(page).toHaveURL(/\/dashboard\/collections$/);
  });

  test("the menu button opens the navigation drawer", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await expect(page.getByRole("button", { name: "Close navigation menu" })).toBeVisible();
  });
});
