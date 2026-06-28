import { expect, test } from "@playwright/test";

const timerStorageKey = "immersive-countdown.timer";

test("restores an active timer after reload", async ({ page }) => {
  const hydrationMessages: string[] = [];

  page.on("console", (message) => {
    const text = message.text();

    if (message.type() === "error" || text.includes("Hydration failed")) {
      hydrationMessages.push(text);
    }
  });

  await page.goto("/");

  await page.getByTestId("timer-primary-action").click();
  await page.waitForTimeout(1_500);

  await expect(page.getByRole("timer")).not.toHaveText("25:00");
  await expect
    .poll(async () =>
      page.evaluate((storageKey) => {
        const raw = window.localStorage.getItem(storageKey);

        return raw ? JSON.parse(raw).timer.status : null;
      }, timerStorageKey),
    )
    .toBe("running");
  await expect(page.getByTestId("timer-primary-action")).toHaveText("暂停");

  await page.reload();

  await expect(page.getByRole("timer")).not.toHaveText("25:00");
  await expect
    .poll(async () =>
      page.evaluate((storageKey) => {
        const raw = window.localStorage.getItem(storageKey);

        if (!raw) return null;

        const parsed = JSON.parse(raw);

        return {
          remaining: parsed.timer.endsAt - Date.now(),
          status: parsed.timer.status,
        };
      }, timerStorageKey),
    )
    .toMatchObject({ status: "running" });
  await expect(page.getByTestId("timer-primary-action")).toHaveText("暂停");
  await expect
    .poll(() => hydrationMessages, {
      message: "timer recovery should not emit hydration mismatch errors during reload",
    })
    .toEqual([]);
});

test("keeps timer controls usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.locator('[role="tablist"]')).toBeVisible();

  await expect(page.getByTestId("timer-primary-action")).toBeVisible();
  await page.getByTestId("timer-primary-action").click();

  await expect(page.getByRole("timer")).not.toHaveText("25:00");
});

test("falls back to the static ocean background when the loop video errors", async ({ page }) => {
  await page.goto("/");

  await page.locator('button[aria-pressed]').click();
  await expect(page.getByTestId("ocean-video")).toBeVisible();

  await page.getByTestId("ocean-video").dispatchEvent("error");

  await expect(page.getByTestId("ocean-background")).toBeVisible();
  await expect(page.getByTestId("ocean-video")).toHaveCount(0);
});

test("shows a non-blocking music failure message when the search request fails", async ({ page }) => {
  await page.route("**/api/music/search?**", async (route) => {
    await route.abort("failed");
  });

  await page.goto("/");
  await page.locator('button[aria-controls="music-drawer"]').click();
  await page.locator("#music-search-input").fill("ocean");
  await page.locator('#music-drawer button[type="submit"]').click();

  await expect(page.getByText("Music search is temporarily unavailable")).toBeVisible();
});
