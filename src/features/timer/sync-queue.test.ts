import { describe, expect, test } from "vitest";

import {
  createMemoryQueue,
  createSessionQueue,
  enqueueSession,
  flushSessions,
  getDefaultSessionQueueForTests,
  resetDefaultSessionQueueForTests,
  type PendingSession,
} from "./sync-queue";

function session(overrides: Partial<PendingSession> = {}): PendingSession {
  return {
    syncKey: "sync-1",
    mode: "focus",
    startedAt: "2026-06-24T12:00:00.000Z",
    endedAt: "2026-06-24T12:25:00.000Z",
    durationMs: 1_500_000,
    interrupted: false,
    ...overrides,
  };
}

describe("flushSessions", () => {
  test("keeps failed records and removes acknowledged records", async () => {
    const queue = createMemoryQueue([session({ syncKey: "a" }), session({ syncKey: "b" })]);

    await flushSessions(queue, async (record) => record.syncKey === "a");

    await expect(queue.items()).resolves.toEqual([session({ syncKey: "b" })]);
  });
});

describe("enqueueSession", () => {
  test("keeps records in the default memory fallback queue across calls", async () => {
    resetDefaultSessionQueueForTests({ indexedDB: null });

    await enqueueSession(session({ syncKey: "default-a" }));
    await enqueueSession(session({ syncKey: "default-b", mode: "leisure" }));

    const queue = getDefaultSessionQueueForTests();

    await expect(queue.items()).resolves.toEqual([
      session({ syncKey: "default-a" }),
      session({ syncKey: "default-b", mode: "leisure" }),
    ]);

    resetDefaultSessionQueueForTests();
  });

  test("replaces an existing queued record with the same syncKey", async () => {
    const queue = createMemoryQueue([session({ syncKey: "same", interrupted: false })]);

    await enqueueSession(session({ syncKey: "same", interrupted: true }), queue);

    await expect(queue.items()).resolves.toEqual([session({ syncKey: "same", interrupted: true })]);
  });
});

describe("createSessionQueue", () => {
  test("falls back to the in-memory queue when IndexedDB is unavailable", async () => {
    const queue = createSessionQueue({ indexedDB: null });

    await queue.put(session());

    await expect(queue.items()).resolves.toEqual([session()]);
  });
});
