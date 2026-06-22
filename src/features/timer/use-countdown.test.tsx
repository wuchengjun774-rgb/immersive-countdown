import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { TIMER_STORAGE_KEY } from "./local-timer-store";
import { useCountdown } from "./use-countdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  test("starts in focus mode with the default 25/5/4 configuration", () => {
    const { result } = renderHook(() => useCountdown());

    expect(result.current.mode).toBe("focus");
    expect(result.current.focusSession).toEqual({ phase: "focus", round: 1, rounds: 4, done: false });
    expect(result.current.remainingMs).toBe(1_500_000);
  });

  test("advances from focus to break and then to the next focus round", () => {
    const { result } = renderHook(() => useCountdown());

    act(() => {
      result.current.startFocus();
      result.current.completePhase();
    });

    expect(result.current.focusSession).toEqual({ phase: "break", round: 1, rounds: 4, done: false });
    expect(result.current.remainingMs).toBe(300_000);
    expect(result.current.timer.status).toBe("running");

    act(() => {
      result.current.completePhase();
    });

    expect(result.current.focusSession).toEqual({ phase: "focus", round: 2, rounds: 4, done: false });
    expect(result.current.remainingMs).toBe(1_500_000);
  });

  test("restores an active timer from localStorage with recalculated remaining time", () => {
    window.localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        mode: "focus",
        focusSession: { phase: "focus", round: 2, rounds: 4, done: false },
        timer: { status: "running", durationMs: 1_500_000, endsAt: 1_500_000, remainingOnPauseMs: null },
      }),
    );

    vi.setSystemTime(60_000);

    const { result } = renderHook(() => useCountdown());

    expect(result.current.focusSession).toEqual({ phase: "focus", round: 2, rounds: 4, done: false });
    expect(result.current.timer.status).toBe("running");
    expect(result.current.remainingMs).toBe(1_440_000);
  });

  test("restores expired timers as completed", () => {
    window.localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        mode: "focus",
        focusSession: { phase: "break", round: 4, rounds: 4, done: false },
        timer: { status: "running", durationMs: 300_000, endsAt: 300_000, remainingOnPauseMs: null },
      }),
    );

    vi.setSystemTime(500_000);

    const { result } = renderHook(() => useCountdown());

    expect(result.current.timer.status).toBe("completed");
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.focusSession).toEqual({ phase: "break", round: 4, rounds: 4, done: false });
  });

  test("uses a custom duration in leisure mode without a focus session", () => {
    const { result } = renderHook(() => useCountdown({ mode: "leisure", durationMs: 90_000 }));

    expect(result.current.mode).toBe("leisure");
    expect(result.current.focusSession).toBeUndefined();
    expect(result.current.remainingMs).toBe(90_000);

    act(() => result.current.startFocus());

    expect(result.current.timer.status).toBe("running");
    expect(result.current.timer.durationMs).toBe(90_000);
  });

  test("restores a persisted leisure timer", () => {
    window.localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        mode: "leisure",
        timer: { status: "running", durationMs: 120_000, endsAt: 120_000, remainingOnPauseMs: null },
      }),
    );
    vi.setSystemTime(30_000);

    const { result } = renderHook(() => useCountdown({ mode: "leisure", durationMs: 60_000 }));

    expect(result.current.mode).toBe("leisure");
    expect(result.current.remainingMs).toBe(90_000);
    expect(result.current.focusSession).toBeUndefined();
  });

  test("completes after the final break without starting a fifth round", () => {
    window.localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        mode: "focus",
        focusSession: { phase: "break", round: 4, rounds: 4, done: false },
        timer: { status: "running", durationMs: 300_000, endsAt: 300_000, remainingOnPauseMs: null },
      }),
    );
    const { result } = renderHook(() => useCountdown({ mode: "focus" }));

    act(() => result.current.completePhase());

    expect(result.current.focusSession).toEqual({ phase: "focus", round: 5, rounds: 4, done: true });
    expect(result.current.timer.status).toBe("completed");
    expect(result.current.timer.endsAt).toBeNull();
    expect(result.current.remainingMs).toBe(0);
  });
});
