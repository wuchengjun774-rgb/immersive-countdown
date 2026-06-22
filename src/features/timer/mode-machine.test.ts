import { expect, test } from "vitest";

import { advanceFocusPhase, defaultFocusConfig } from "./mode-machine";

test("defaults to 25/5 minutes and four rounds", () => {
  expect(defaultFocusConfig).toEqual({ focusMs: 1_500_000, breakMs: 300_000, rounds: 4 });
});

test("moves focus to break without incrementing the round", () => {
  expect(advanceFocusPhase({ phase: "focus", round: 1, rounds: 4 })).toEqual({
    phase: "break",
    round: 1,
    rounds: 4,
    done: false,
  });
});

test("returns to focus on the next round after a break", () => {
  expect(advanceFocusPhase({ phase: "break", round: 1, rounds: 4 })).toEqual({
    phase: "focus",
    round: 2,
    rounds: 4,
    done: false,
  });
});

test("marks the session done after the last break", () => {
  expect(advanceFocusPhase({ phase: "break", round: 4, rounds: 4 })).toEqual({
    phase: "focus",
    round: 5,
    rounds: 4,
    done: true,
  });
});
