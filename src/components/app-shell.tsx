"use client";

import { useState, type ReactNode } from "react";

import { OceanBackground } from "./ocean-background";

export function AppShell({ children }: { children: ReactNode }) {
  const [motionEnabled, setMotionEnabled] = useState(false);

  return (
    <main className="relative isolate flex min-h-svh overflow-hidden text-white">
      <OceanBackground motionEnabled={motionEnabled} />
      <div className="relative z-10 flex min-h-svh w-full flex-col px-5 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-sm font-medium tracking-[0.3em] text-white/85 sm:text-base">潮汐时光</h1>
          <button
            aria-pressed={motionEnabled}
            className="rounded-full border border-white/25 bg-black/10 px-4 py-2 text-xs tracking-wide text-white/80 backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            onClick={() => setMotionEnabled((enabled) => !enabled)}
            type="button"
          >
            {motionEnabled ? "关闭动态背景" : "启用动态背景"}
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center py-12">{children}</div>
        <p className="text-center text-[0.65rem] tracking-[0.28em] text-white/55">听潮 · 呼吸 · 专注当下</p>
      </div>
    </main>
  );
}
