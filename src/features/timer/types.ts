export type TimerStatus = "idle" | "running" | "paused" | "completed";

export type TimerState = {
  status: TimerStatus;
  durationMs: number;
  endsAt: number | null;
  remainingOnPauseMs: number | null;
};
