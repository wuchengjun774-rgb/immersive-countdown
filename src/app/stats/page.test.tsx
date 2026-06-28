import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockAuth, mockTimerSessionFindMany } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockTimerSessionFindMany: vi.fn(),
}));

vi.mock("@/auth/config", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    timerSession: {
      findMany: mockTimerSessionFindMany,
    },
  },
}));

vi.mock("@/lib/session-repository", () => ({
  findUserIdByEmail: vi.fn(),
}));

import Page, { formatShortDate } from "./page";

describe("/stats page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-28T12:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("renders a safe empty state when the viewer is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    render(await Page());

    expect(screen.getByRole("heading", { name: "Focus insights" })).toBeTruthy();
    expect(screen.getByText("Today focus")).toBeTruthy();
    expect(screen.getAllByText("0m").length).toBeGreaterThan(0);
    expect(screen.getByText("Sign in to see synced focus history.")).toBeTruthy();
    expect(mockTimerSessionFindMany).not.toHaveBeenCalled();
  });

  test("renders today metrics and recent seven-day focus history for an authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "focus-user" } });
    mockTimerSessionFindMany.mockResolvedValue([
      {
        mode: "focus",
        durationMs: 1_500_000,
        interrupted: false,
        endedAt: new Date("2026-06-28T12:00:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 300_000,
        interrupted: true,
        endedAt: new Date("2026-06-28T13:00:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 900_000,
        interrupted: false,
        endedAt: new Date("2026-06-27T12:00:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 1_200_000,
        interrupted: false,
        endedAt: new Date("2026-06-26T12:00:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 600_000,
        interrupted: false,
        endedAt: new Date("2026-06-24T12:00:00.000Z"),
      },
      {
        mode: "leisure",
        durationMs: 1_800_000,
        interrupted: false,
        endedAt: new Date("2026-06-28T15:00:00.000Z"),
      },
    ]);

    render(await Page());

    expect(screen.getAllByText("25m").length).toBeGreaterThan(0);
    expect(screen.getByText("3 days")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Recent seven days" })).toBeTruthy();
    expect(screen.getByText("Jun 24")).toBeTruthy();
    expect(screen.getByText("10m")).toBeTruthy();
    expect(screen.getByText("Completed rounds")).toBeTruthy();
  });

  test("keeps stored local-day labels stable for UTC+14 dates", () => {
    expect(formatShortDate("2026-01-01")).toBe("Jan 1");
  });
});
