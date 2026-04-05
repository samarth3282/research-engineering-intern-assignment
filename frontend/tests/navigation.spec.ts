import { expect, test } from "@playwright/test";

test("root redirects to explore", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/explore/);
});

test("mobile navigation renders and routes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only navigation assertion");

  await page.goto("/explore");
  await expect(page.getByRole("link", { name: "Topic" })).toBeVisible();
  await page.getByRole("link", { name: "Topic" }).click();
  await expect(page).toHaveURL(/\/landscape/);
});
