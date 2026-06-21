import type { TimerState } from "./types";

export function createTimer(config: { durationMs: number }, now: number): TimerState {
  return { status: "running", durationMs: config.durationMs, endsAt: now + config.durationMs, remainingOnPauseMs: null };
}

export function remainingMs(state: TimerState, now: number): number {
  if (state.status === "paused") return state.remainingOnPauseMs ?? 0;
  if (state.endsAt === null) return state.durationMs;
  return Math.max(0, state.endsAt - now);
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  return { ...state, status: "paused", endsAt: null, remainingOnPauseMs: remainingMs(state, now) };
}

export function resumeTimer(state: TimerState, now: number): TimerState {
  const remaining = state.remainingOnPauseMs ?? state.durationMs;
  return { ...state, status: "running", endsAt: now + remaining, remainingOnPauseMs: null };
}
