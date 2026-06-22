"use client";

import { useEffect, useState } from "react";

import { createTimer, pauseTimer, remainingMs, resumeTimer } from "./timer-engine";
import { loadTimerState, saveTimerState, type StoredCountdown } from "./local-timer-store";
import { advanceFocusPhase, defaultFocusConfig } from "./mode-machine";

export type CountdownOptions = { mode: "focus" } | { mode: "leisure"; durationMs: number };

function initialCountdown(options: CountdownOptions): StoredCountdown {
  const restored =
    typeof window === "undefined" ? null : loadTimerState(window.localStorage, Date.now());
  if (restored?.mode === options.mode) return restored;

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

export function useCountdown(options: CountdownOptions = { mode: "focus" }) {
  const [state, setState] = useState<StoredCountdown>(() => initialCountdown(options));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    saveTimerState(window.localStorage, state);
  }, [state]);

  const startFocus = () => {
    const startedAt = Date.now();
    setNow(startedAt);
    setState((current) => ({ ...current, timer: createTimer({ durationMs: current.timer.durationMs }, startedAt) }));
  };

  const completePhase = () => {
    const startedAt = Date.now();
    setNow(startedAt);
    setState((current) => {
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
    });
  };

  const pause = () => {
    const pausedAt = Date.now();
    setNow(pausedAt);
    setState((current) => ({ ...current, timer: pauseTimer(current.timer, pausedAt) }));
  };

  const resume = () => {
    const resumedAt = Date.now();
    setNow(resumedAt);
    setState((current) => ({ ...current, timer: resumeTimer(current.timer, resumedAt) }));
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
