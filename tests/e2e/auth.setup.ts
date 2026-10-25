import { test as setup } from "@playwright/test";
import { DEMO_STATE, DEMO_USER, expectOnDashboard, signIn } from "./support/auth";

setup("sign in the demo user", async ({ page }) => {
  await signIn(page, DEMO_USER.email, DEMO_USER.password);
  await expectOnDashboard(page);
  await page.context().storageState({ path: DEMO_STATE });
});
