import { expect, test } from "@playwright/test";

const timerStorageKey = "immersive-countdown.timer";

async function readQueuedSessions(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("immersive-countdown", 1);

      request.addEventListener("upgradeneeded", () => {
        const database = request.result;

        if (!database.objectStoreNames.contains("timer-session-sync")) {
          database.createObjectStore("timer-session-sync", { keyPath: "syncKey" });
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error ?? new Error("Failed to open IndexedDB")));
    });

    const transaction = database.transaction("timer-session-sync", "readonly");
    const records = await new Promise<Array<{ interrupted: boolean }>>((resolve, reject) => {
      const request = transaction.objectStore("timer-session-sync").getAll();

      request.addEventListener("success", () => resolve(request.result as Array<{ interrupted: boolean }>));
      request.addEventListener("error", () => reject(request.error ?? new Error("Failed to read sync queue")));
    });

    database.close();

    return records;
  });
}

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

test("advances into break and queues a successful session when a focus timer expires naturally", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        mode: "focus",
        focusSession: { phase: "focus", round: 1, rounds: 4, done: false },
        timer: { status: "running", durationMs: 1_500_000, endsAt: Date.now() + 500, remainingOnPauseMs: null },
      }),
    );
  }, timerStorageKey);

  await page.reload();

  await expect(page.getByRole("timer")).toHaveText("05:00");
  await expect
    .poll(async () =>
      page.evaluate((storageKey) => {
        const raw = window.localStorage.getItem(storageKey);

        return raw ? JSON.parse(raw).focusSession : null;
      }, timerStorageKey),
    )
    .toMatchObject({ phase: "break", round: 1, done: false });
  await expect.poll(async () => (await readQueuedSessions(page))[0]?.interrupted).toBe(false);
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
