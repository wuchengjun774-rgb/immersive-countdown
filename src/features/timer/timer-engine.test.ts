import { expect, test } from "vitest";

import { createTimer, pauseTimer, remainingMs, resumeTimer } from "./timer-engine";

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
