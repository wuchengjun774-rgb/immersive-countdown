import { expect, test } from "@playwright/test";

async function readQueuedSessionCount(page: import("@playwright/test").Page) {
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
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const request = transaction.objectStore("timer-session-sync").getAll();

      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error ?? new Error("Failed to read sync queue")));
    });

    database.close();

    return records.length;
  });
}

test("queues a completed timer while offline and flushes it after reconnect", async ({ context, page }) => {
  await page.goto("/");

  await page.getByTestId("timer-primary-action").click();
  await expect(page.getByTestId("timer-complete-action")).toBeVisible();

  await context.setOffline(true);
  await page.getByTestId("timer-complete-action").click();

  await expect(page.getByTestId("sync-status")).toHaveText("Session saved offline. It will sync when you're back online.");
  await expect.poll(() => readQueuedSessionCount(page)).toBe(1);

  await page.route("**/api/timer-sessions", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ acknowledged: true }),
    });
  });
  await context.setOffline(false);

  await expect(page.getByTestId("sync-status")).toHaveText("Session record synced.");
  await expect.poll(() => readQueuedSessionCount(page)).toBe(0);
});

test("keeps an authenticated-sync fallback queued when the server requires sign-in", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("timer-primary-action").click();
  await page.getByTestId("timer-complete-action").click();

  await expect(page.getByTestId("sync-status")).toHaveText("Sign in to sync session records.");
  await expect.poll(() => readQueuedSessionCount(page)).toBe(1);
});
