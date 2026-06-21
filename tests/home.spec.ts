import { expect, test } from "@playwright/test";

test("shows the product name on the home page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "潮汐时光" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("潮汐时光");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "沉浸式海景倒计时",
  );
});
