"use client";

import { useEffect, useRef, useState } from "react";

import { createTimer, pauseTimer, remainingMs, resumeTimer } from "./timer-engine";
import { loadTimerState, saveTimerState, type StoredCountdown } from "./local-timer-store";
import { advanceFocusPhase, defaultFocusConfig } from "./mode-machine";

export type CountdownCompletion = {
  completedAt: number;
  durationMs: number;
  mode: "focus" | "leisure";
  phase?: "focus" | "break";
};

export type CountdownOptions =
  | { mode: "focus"; onComplete?: (completion: CountdownCompletion) => void }
  | { mode: "leisure"; durationMs: number; onComplete?: (completion: CountdownCompletion) => void };

function createDefaultCountdown(options: CountdownOptions): StoredCountdown {
  if (options.mode === "leisure") {
    return {
      mode: "leisure",
      timer: { status: "idle", durationMs: options.durationMs, endsAt: null, remainingOnPauseMs: null },
    };
  }

  return {
    mode: "focus",
    focusSession: { phase: "focus", round: 1, rounds: defaultFocusConfig.rounds, done: false },
    timer: {
      status: "idle",
      durationMs: defaultFocusConfig.focusMs,
      endsAt: null,
      remainingOnPauseMs: null,
    },
  };
}

function advanceCountdown(current: StoredCountdown, startedAt: number): StoredCountdown {
  if (current.mode === "leisure") {
    return { ...current, timer: { ...current.timer, status: "completed", endsAt: null, remainingOnPauseMs: null } };
  }

  const focusSession = advanceFocusPhase(current.focusSession);

  if (focusSession.done) {
    return {
      ...current,
      focusSession,
      timer: { ...current.timer, status: "completed", endsAt: null, remainingOnPauseMs: null },
    };
  }

  const durationMs = focusSession.phase === "focus" ? defaultFocusConfig.focusMs : defaultFocusConfig.breakMs;

  return { ...current, focusSession, timer: createTimer({ durationMs }, startedAt) };
}

export function useCountdown(options: CountdownOptions = { mode: "focus" }) {
  const optionMode = options.mode;
  const optionDurationMs = options.mode === "leisure" ? options.durationMs : null;
  const onComplete = options.onComplete;
  const [state, setState] = useState<StoredCountdown>(() => createDefaultCountdown(options));
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const tickNow = Date.now();
      const current = stateRef.current;

      setNow(tickNow);
      if (current.timer.status !== "running" || current.timer.endsAt === null || current.timer.endsAt > tickNow) return;

      const nextCompletion: CountdownCompletion = {
        completedAt: current.timer.endsAt,
        durationMs: current.timer.durationMs,
        mode: current.mode,
        phase: current.mode === "focus" ? current.focusSession.phase : undefined,
      };
      const nextState = advanceCountdown(current, tickNow);

      stateRef.current = nextState;
      setState(nextState);
      onComplete?.(nextCompletion);
    }, 250);
    return () => window.clearInterval(id);
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const syncedNow = Date.now();
      const restored = loadTimerState(window.localStorage, syncedNow);
      const nextDefault = createDefaultCountdown(
        optionMode === "leisure"
          ? { mode: "leisure", durationMs: optionDurationMs ?? 0 }
          : { mode: "focus" },
      );
      const restoredState =
        restored?.mode === "focus" &&
        restored.timer.status === "completed" &&
        restored.timer.endsAt !== null &&
        restored.timer.endsAt <= syncedNow
          ? advanceCountdown(restored, syncedNow)
          : restored;

      if (
        restored?.mode === "focus" &&
        restored.timer.status === "completed" &&
        restored.timer.endsAt !== null &&
        restored.timer.endsAt <= syncedNow &&
        restored.focusSession.phase === "focus"
      ) {
        onComplete?.({
          completedAt: restored.timer.endsAt,
          durationMs: restored.timer.durationMs,
          mode: "focus",
          phase: "focus",
        });
      }

      setNow(syncedNow);
      const nextState = restoredState?.mode === optionMode ? restoredState : nextDefault;
      stateRef.current = nextState;
      setState(nextState);
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [onComplete, optionDurationMs, optionMode]);

  useEffect(() => {
    if (!hydrated) return;

    saveTimerState(window.localStorage, state);
  }, [hydrated, state]);

  const startFocus = () => {
    const startedAt = Date.now();
    const nextState: StoredCountdown = {
      ...stateRef.current,
      timer: createTimer({ durationMs: stateRef.current.timer.durationMs }, startedAt),
    };

    setNow(startedAt);
    stateRef.current = nextState;
    setState(nextState);
  };

  const completePhase = () => {
    const startedAt = Date.now();
    const nextState = advanceCountdown(stateRef.current, startedAt);

    setNow(startedAt);
    stateRef.current = nextState;
    setState(nextState);
  };

  const pause = () => {
    const pausedAt = Date.now();
    const nextState: StoredCountdown = { ...stateRef.current, timer: pauseTimer(stateRef.current.timer, pausedAt) };

    setNow(pausedAt);
    stateRef.current = nextState;
    setState(nextState);
  };

  const resume = () => {
    const resumedAt = Date.now();
    const nextState: StoredCountdown = { ...stateRef.current, timer: resumeTimer(stateRef.current.timer, resumedAt) };

    setNow(resumedAt);
    stateRef.current = nextState;
    setState(nextState);
  };

  return {
    ...state,
    remainingMs: remainingMs(state.timer, now),
    startFocus,
    pause,
    resume,
    completePhase,
  };
}
