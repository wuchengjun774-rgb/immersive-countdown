import { expect, test } from "@playwright/test";

test("renders the safe auth fallback when deployment auth is not configured", async ({ page }) => {
  await page.goto("/login?status=auth-unavailable");

  await expect(
    page
      .locator("p")
      .filter({ hasText: "Sign-in is temporarily unavailable because authentication isn't configured for this deployment." })
      .last(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Send verification code" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sign in with email code" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue with WeChat" })).toBeDisabled();
});

test("renders the email delivery fallback copy without implying a successful auth mock", async ({ page }) => {
  await page.goto("/login?status=not-configured&email=person%40example.com");

  await expect(
    page
      .locator("p")
      .filter({
        hasText: "Email code delivery isn't configured right now. Use WeChat sign-in if it's available, or try again later.",
      })
      .last(),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveValue("person@example.com");
  await expect(page.getByRole("button", { name: "Send verification code" })).toBeDisabled();
});
