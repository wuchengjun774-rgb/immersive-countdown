import { describe, expect, test } from "vitest";

import { loadTimerState, TIMER_STORAGE_KEY } from "./local-timer-store";

function storageWith(value: string): Storage {
  return {
    getItem: (key) => (key === TIMER_STORAGE_KEY ? value : null),
  } as Storage;
}

describe("loadTimerState", () => {
  test.each([
    "not json",
    "null",
    "{}",
    JSON.stringify({ mode: "other", timer: {} }),
    JSON.stringify({ mode: "focus", focusSession: {}, timer: {} }),
    JSON.stringify({
      mode: "leisure",
      timer: { status: "running", durationMs: -1, endsAt: 10, remainingOnPauseMs: null },
    }),
  ])("returns null for invalid persisted data: %s", (value) => {
    expect(loadTimerState(storageWith(value), 0)).toBeNull();
  });
});
