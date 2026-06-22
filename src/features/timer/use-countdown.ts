"use client";

import { useEffect, useState } from "react";

import { createTimer, remainingMs } from "./timer-engine";
import { loadTimerState, saveTimerState, type StoredCountdown } from "./local-timer-store";
import { advanceFocusPhase, defaultFocusConfig } from "./mode-machine";

function initialCountdown(): StoredCountdown {
  const restored = loadTimerState(window.localStorage, Date.now());
  if (restored) return restored;

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

export function useCountdown() {
  const [state, setState] = useState<StoredCountdown>(initialCountdown);
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
      const focusSession = advanceFocusPhase(current.focusSession);
      const durationMs = focusSession.phase === "focus" ? defaultFocusConfig.focusMs : defaultFocusConfig.breakMs;
      return { ...current, focusSession, timer: createTimer({ durationMs }, startedAt) };
    });
  };

  return {
    ...state,
    remainingMs: remainingMs(state.timer, now),
    startFocus,
    completePhase,
  };
}
