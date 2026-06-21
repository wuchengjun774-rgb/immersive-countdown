import { expect, test } from "vitest";

import { createTimer, pauseTimer, remainingMs, resumeTimer } from "./timer-engine";
import type { TimerState } from "./types";

test("uses an absolute end time and survives delayed ticks", () => {
  const running = createTimer({ durationMs: 60_000 }, 1_000);

  expect(remainingMs(running, 31_000)).toBe(30_000);
  expect(remainingMs(running, 70_000)).toBe(0);
});

test("preserves remaining time while paused", () => {
  const paused = pauseTimer(createTimer({ durationMs: 60_000 }, 0), 20_000);

  expect(remainingMs(paused, 50_000)).toBe(40_000);
  expect(remainingMs(resumeTimer(paused, 50_000), 60_000)).toBe(30_000);
});

test("defines remaining time explicitly for idle and completed timers", () => {
  const idle: TimerState = { status: "idle", durationMs: 60_000, endsAt: 1, remainingOnPauseMs: null };
  const completed: TimerState = { status: "completed", durationMs: 60_000, endsAt: 100_000, remainingOnPauseMs: null };

  expect(remainingMs(idle, 50_000)).toBe(60_000);
  expect(remainingMs(completed, 50_000)).toBe(0);
});

test("does not resume timers that are not paused", () => {
  const idle: TimerState = { status: "idle", durationMs: 60_000, endsAt: null, remainingOnPauseMs: null };
  const completed: TimerState = { status: "completed", durationMs: 60_000, endsAt: null, remainingOnPauseMs: null };

  expect(resumeTimer(idle, 50_000)).toBe(idle);
  expect(resumeTimer(completed, 50_000)).toBe(completed);
});
