"use client";

import { useState } from "react";

import { useCountdown } from "./use-countdown";

type TimerMode = "focus" | "leisure";

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

  return (
    <section aria-label="倒计时" className="flex w-full max-w-3xl flex-col items-center text-center">
      <div
        aria-label="计时模式"
        className="flex rounded-full border border-white/20 bg-black/10 p-1 backdrop-blur-md"
        role="tablist"
      >
        {(["focus", "leisure"] as const).map((value) => (
          <button
            aria-selected={mode === value}
            className="rounded-full px-5 py-2 text-sm text-white/65 transition aria-selected:bg-white/15 aria-selected:text-white focus-visible:outline-2 focus-visible:outline-white"
            key={value}
            onClick={() => setMode(value)}
            role="tab"
            type="button"
          >
            {value === "focus" ? "专注模式" : "休闲模式"}
          </button>
        ))}
      </div>
      <CountdownDisplay key={mode} mode={mode} />
    </section>
  );
}
