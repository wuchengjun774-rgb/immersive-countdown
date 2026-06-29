"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { enqueueSession, flushSessions, type PendingSession } from "./sync-queue";
import { useCountdown, type CountdownCompletion } from "./use-countdown";

type TimerMode = "focus" | "leisure";

const tabs = [
  { value: "focus", label: "专注模式" },
  { value: "leisure", label: "休闲模式" },
] as const satisfies ReadonlyArray<{ value: TimerMode; label: string }>;

function formatTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createPendingSession(
  mode: TimerMode,
  durationMs: number,
  remainingMs: number,
  interrupted: boolean,
  now = Date.now(),
): PendingSession {
  const completedMs = Math.max(0, durationMs - remainingMs);

  return {
    syncKey: `${mode}-${now}`,
    mode,
    startedAt: new Date(now - completedMs).toISOString(),
    endedAt: new Date(now).toISOString(),
    durationMs: completedMs,
    interrupted,
  };
}

async function sendSession(record: PendingSession) {
  try {
    const response = await fetch("/api/timer-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    });

    return response.ok;
  } catch {
    return false;
  }
}

function CountdownDisplay({ mode }: { mode: TimerMode }) {
  const [syncStatus, setSyncStatus] = useState("Session records stay local until sync is available.");
  const [isCompleting, setIsCompleting] = useState(false);
  const completingRef = useRef(false);

  const flushQueuedSessions = useCallback(async () => {
    let attempted = false;
    let synced = false;

    await flushSessions(undefined, async (record) => {
      attempted = true;
      const acknowledged = await sendSession(record);
      synced ||= acknowledged;
      return acknowledged;
    });

    if (attempted) {
      setSyncStatus(synced ? "Session record synced." : "Sign in to sync session records.");
    }
  }, []);

  const recordNaturalCompletion = useCallback(
    (completion: CountdownCompletion) => {
      if (completion.mode !== "focus" || completion.phase !== "focus") return;

      const pendingSession = createPendingSession(
        completion.mode,
        completion.durationMs,
        0,
        false,
        completion.completedAt,
      );

      void enqueueSession(pendingSession).then(() => {
        if (navigator.onLine) {
          void flushQueuedSessions();
          return;
        }

        setSyncStatus("Session saved offline. It will sync when you're back online.");
      });
    },
    [flushQueuedSessions],
  );

  const countdown = useCountdown(
    mode === "focus"
      ? { mode, onComplete: recordNaturalCompletion }
      : { mode, durationMs: 15 * 60_000, onComplete: recordNaturalCompletion },
  );
  const isIdle = countdown.timer.status === "idle";
  const isPaused = countdown.timer.status === "paused";
  const isCompleted = countdown.timer.status === "completed";
  const canComplete = countdown.timer.status === "running" || countdown.timer.status === "paused";
  const actionLabel = isIdle || isCompleted ? (mode === "focus" ? "开始专注" : "开始休闲计时") : isPaused ? "恢复" : "暂停";
  const phaseLabel =
    mode === "focus"
      ? countdown.focusSession?.phase === "break"
        ? "休息时刻"
        : `第 ${countdown.focusSession?.round ?? 1} 轮专注`
      : "自由倒计时";

  const handleAction = () => {
    if (isIdle || isCompleted) {
      countdown.startFocus();
      return;
    }

    if (isPaused) {
      countdown.resume();
      return;
    }

    countdown.pause();
  };

  useEffect(() => {
    const flushWhenOnline = () => {
      void flushQueuedSessions();
    };

    window.addEventListener("online", flushWhenOnline);

    if (navigator.onLine) {
      queueMicrotask(() => {
        void flushQueuedSessions();
      });
    }

    return () => window.removeEventListener("online", flushWhenOnline);
  }, [flushQueuedSessions]);

  const completeSession = async () => {
    if (completingRef.current) return;

    completingRef.current = true;
    setIsCompleting(true);

    const pendingSession = createPendingSession(mode, countdown.timer.durationMs, countdown.remainingMs, true);

    countdown.completePhase();

    try {
      await enqueueSession(pendingSession);

      if (!navigator.onLine) {
        setSyncStatus("Session saved offline. It will sync when you're back online.");
        return;
      }

      await flushQueuedSessions();
    } finally {
      completingRef.current = false;
      setIsCompleting(false);
    }
  };

  return (
    <>
      <p className="mt-8 text-xs tracking-[0.32em] text-white/65">{phaseLabel}</p>
      <output
        aria-live="polite"
        className="my-5 text-[clamp(4.5rem,19vw,10rem)] font-extralight leading-none tracking-[-0.06em] tabular-nums drop-shadow-lg"
        role="timer"
      >
        {formatTime(countdown.remainingMs)}
      </output>
      <button
        className="min-w-36 rounded-full border border-white/35 bg-white/10 px-7 py-3 text-sm tracking-[0.2em] backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        data-testid="timer-primary-action"
        onClick={handleAction}
        type="button"
      >
        {actionLabel}
      </button>
      {canComplete ? (
        <button
          className="mt-3 rounded-full border border-cyan-200/35 bg-cyan-100/10 px-5 py-2 text-xs tracking-[0.18em] text-cyan-50 transition hover:bg-cyan-100/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-100 disabled:cursor-wait disabled:opacity-60"
          data-testid="timer-complete-action"
          disabled={isCompleting}
          onClick={() => void completeSession()}
          type="button"
        >
          {isCompleting ? "Ending session..." : "End session"}
        </button>
      ) : null}
      <p className="mt-4 text-xs text-white/60" data-testid="sync-status">
        {syncStatus}
      </p>
    </>
  );
}

export function TimerFace() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const tabRefs = useRef<Record<TimerMode, HTMLButtonElement | null>>({ focus: null, leisure: null });
  const baseId = useId();
  const panelId = `${baseId}-panel`;

  const focusTab = (nextMode: TimerMode) => {
    setMode(nextMode);
    tabRefs.current[nextMode]?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentMode: TimerMode) => {
    const currentIndex = tabs.findIndex((tab) => tab.value === currentMode);

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": {
        event.preventDefault();
        focusTab(tabs[(currentIndex + 1) % tabs.length].value);
        return;
      }
      case "ArrowLeft":
      case "ArrowUp": {
        event.preventDefault();
        focusTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length].value);
        return;
      }
      case "Home":
        event.preventDefault();
        focusTab(tabs[0].value);
        return;
      case "End":
        event.preventDefault();
        focusTab(tabs[tabs.length - 1].value);
        return;
      default:
        return;
    }
  };

  return (
    <section aria-label="倒计时" className="flex w-full max-w-3xl flex-col items-center text-center">
      <div
        aria-label="计时模式"
        className="flex rounded-full border border-white/20 bg-black/10 p-1 backdrop-blur-md"
        role="tablist"
      >
        {tabs.map((tab) => {
          const selected = mode === tab.value;
          const tabId = `${baseId}-${tab.value}-tab`;

          return (
            <button
              aria-controls={panelId}
              aria-selected={selected}
              className="rounded-full px-5 py-2 text-sm text-white/65 transition aria-selected:bg-white/15 aria-selected:text-white focus-visible:outline-2 focus-visible:outline-white"
              id={tabId}
              key={tab.value}
              onClick={() => setMode(tab.value)}
              onKeyDown={(event) => onTabKeyDown(event, tab.value)}
              ref={(node) => {
                tabRefs.current[tab.value] = node;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={`${baseId}-${mode}-tab`}
        className="flex w-full flex-col items-center"
        id={panelId}
        role="tabpanel"
      >
        <CountdownDisplay key={mode} mode={mode} />
      </div>
    </section>
  );
}
