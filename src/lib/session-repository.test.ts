import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    timerSession: {
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { findUserIdByEmail, saveTimerSession } from "./session-repository";

describe("session-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("upserts timer sessions idempotently by syncKey without overwriting replays", async () => {
    await saveTimerSession({
      userId: "user-123",
      syncKey: "sync-1",
      mode: "focus",
      startedAt: "2026-06-24T12:00:00.000Z",
      endedAt: "2026-06-24T12:25:00.000Z",
      durationMs: 1_500_000,
      interrupted: false,
    });

    expect(mockPrisma.timerSession.upsert).toHaveBeenCalledWith({
      where: { syncKey: "sync-1" },
      create: {
        userId: "user-123",
        syncKey: "sync-1",
        mode: "focus",
        startedAt: new Date("2026-06-24T12:00:00.000Z"),
        endedAt: new Date("2026-06-24T12:25:00.000Z"),
        durationMs: 1_500_000,
        interrupted: false,
      },
      update: {},
    });
  });

  test("returns null when no authenticated email user exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(findUserIdByEmail("missing@example.com")).resolves.toBeNull();
  });
});
