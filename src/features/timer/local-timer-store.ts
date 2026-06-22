import type { FocusSession } from "./mode-machine";
import type { TimerState } from "./types";

export const TIMER_STORAGE_KEY = "immersive-countdown.timer";

export type StoredCountdown =
  | { mode: "focus"; focusSession: FocusSession; timer: TimerState }
  | { mode: "leisure"; focusSession?: undefined; timer: TimerState };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTimerState(value: unknown): value is TimerState {
  if (!isRecord(value)) return false;
  return (
    ["idle", "running", "paused", "completed"].includes(String(value.status)) &&
    typeof value.durationMs === "number" &&
    Number.isFinite(value.durationMs) &&
    value.durationMs >= 0 &&
    (value.endsAt === null || (typeof value.endsAt === "number" && Number.isFinite(value.endsAt))) &&
    (value.remainingOnPauseMs === null ||
      (typeof value.remainingOnPauseMs === "number" && Number.isFinite(value.remainingOnPauseMs) && value.remainingOnPauseMs >= 0))
  );
}

function isFocusSession(value: unknown): value is FocusSession {
  if (!isRecord(value)) return false;
  return (
    (value.phase === "focus" || value.phase === "break") &&
    Number.isInteger(value.round) &&
    Number(value.round) >= 1 &&
    Number.isInteger(value.rounds) &&
    Number(value.rounds) >= 1 &&
    (value.done === undefined || typeof value.done === "boolean")
  );
}

function isStoredCountdown(value: unknown): value is StoredCountdown {
  if (!isRecord(value) || !isTimerState(value.timer)) return false;
  if (value.mode === "leisure") return value.focusSession === undefined;
  return value.mode === "focus" && isFocusSession(value.focusSession);
}

export function loadTimerState(storage: Storage, now: number): StoredCountdown | null {
  const raw = storage.getItem(TIMER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const stored: unknown = JSON.parse(raw);
    if (!isStoredCountdown(stored)) return null;
    if (stored.timer.status === "running" && stored.timer.endsAt !== null && stored.timer.endsAt <= now) {
      return { ...stored, timer: { ...stored.timer, status: "completed" } };
    }
    return stored;
  } catch {
    return null;
  }
}

export function saveTimerState(storage: Storage, state: StoredCountdown): void {
  storage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
}
