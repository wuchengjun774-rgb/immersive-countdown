import { describe, expect, test } from "vitest";

import {
  aggregateDailySessions,
  buildRecentDailyFocusStats,
  type SessionRow,
} from "./aggregate";

describe("aggregateDailySessions", () => {
  test("counts completed focus time but keeps interruption count", () => {
    const rows: SessionRow[] = [
      {
        mode: "focus",
        durationMs: 1_500_000,
        interrupted: false,
        endedAt: new Date("2026-06-26T10:00:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 300_000,
        interrupted: true,
        endedAt: new Date("2026-06-26T10:30:00.000Z"),
      },
    ];

    const result = aggregateDailySessions(rows, "Asia/Shanghai");

    expect(result).toMatchObject({
      completedMs: 1_500_000,
      interruptions: 1,
      completedRounds: 1,
      zone: "Asia/Shanghai",
    });
  });

  test("excludes leisure sessions from focus statistics", () => {
    const rows: SessionRow[] = [
      {
        mode: "focus",
        durationMs: 1_500_000,
        interrupted: false,
        endedAt: new Date("2026-06-26T10:00:00.000Z"),
      },
      {
        mode: "leisure",
        durationMs: 900_000,
        interrupted: false,
        endedAt: new Date("2026-06-26T10:15:00.000Z"),
      },
    ];

    const result = aggregateDailySessions(rows, "Asia/Shanghai");

    expect(result).toMatchObject({
      completedMs: 1_500_000,
      interruptions: 0,
      completedRounds: 1,
    });
  });

  test("builds local-day summaries for the most recent seven days", () => {
    const rows: SessionRow[] = [
      {
        mode: "focus",
        durationMs: 1_500_000,
        interrupted: false,
        endedAt: new Date("2026-06-20T15:30:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 300_000,
        interrupted: true,
        endedAt: new Date("2026-06-21T00:30:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 600_000,
        interrupted: false,
        endedAt: new Date("2026-06-22T01:00:00.000Z"),
      },
      {
        mode: "leisure",
        durationMs: 900_000,
        interrupted: false,
        endedAt: new Date("2026-06-23T02:00:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 900_000,
        interrupted: false,
        endedAt: new Date("2026-06-25T03:00:00.000Z"),
      },
      {
        mode: "focus",
        durationMs: 1_200_000,
        interrupted: false,
        endedAt: new Date("2026-06-26T04:00:00.000Z"),
      },
    ];

    const result = buildRecentDailyFocusStats(
      rows,
      "Asia/Shanghai",
      new Date("2026-06-27T12:00:00.000Z"),
    );

    expect(result).toEqual([
      {
        date: "2026-06-21",
        completedMs: 0,
        completedRounds: 0,
        interruptions: 1,
        zone: "Asia/Shanghai",
      },
      {
        date: "2026-06-22",
        completedMs: 600_000,
        completedRounds: 1,
        interruptions: 0,
        zone: "Asia/Shanghai",
      },
      {
        date: "2026-06-23",
        completedMs: 0,
        completedRounds: 0,
        interruptions: 0,
        zone: "Asia/Shanghai",
      },
      {
        date: "2026-06-24",
        completedMs: 0,
        completedRounds: 0,
        interruptions: 0,
        zone: "Asia/Shanghai",
      },
      {
        date: "2026-06-25",
        completedMs: 900_000,
        completedRounds: 1,
        interruptions: 0,
        zone: "Asia/Shanghai",
      },
      {
        date: "2026-06-26",
        completedMs: 1_200_000,
        completedRounds: 1,
        interruptions: 0,
        zone: "Asia/Shanghai",
      },
      {
        date: "2026-06-27",
        completedMs: 0,
        completedRounds: 0,
        interruptions: 0,
        zone: "Asia/Shanghai",
      },
    ]);
  });
});
