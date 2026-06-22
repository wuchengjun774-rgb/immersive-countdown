import type { FocusSession } from "./mode-machine";
import type { TimerState } from "./types";

export const TIMER_STORAGE_KEY = "immersive-countdown.timer";

export type StoredCountdown = {
  mode: "focus";
  focusSession: FocusSession;
  timer: TimerState;
};

export function loadTimerState(storage: Storage, now: number): StoredCountdown | null {
  const raw = storage.getItem(TIMER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const stored = JSON.parse(raw) as StoredCountdown;
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
