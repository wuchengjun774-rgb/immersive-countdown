"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import { useCountdown } from "./use-countdown";

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

function CountdownDisplay({ mode }: { mode: TimerMode }) {
  const countdown = useCountdown(mode === "focus" ? { mode } : { mode, durationMs: 15 * 60_000 });
  const isIdle = countdown.timer.status === "idle";
  const isPaused = countdown.timer.status === "paused";
  const actionLabel = isIdle ? (mode === "focus" ? "开始专注" : "开始休闲计时") : isPaused ? "恢复" : "暂停";
  const phaseLabel =
    mode === "focus"
      ? countdown.focusSession?.phase === "break"
        ? "休息时刻"
        : `第 ${countdown.focusSession?.round ?? 1} 轮专注`
      : "自由倒计时";

  const handleAction = () => {
    if (isIdle) {
      countdown.startFocus();
      return;
    }

    if (isPaused) {
      countdown.resume();
      return;
    }

    countdown.pause();
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
        onClick={handleAction}
        type="button"
      >
        {actionLabel}
      </button>
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
