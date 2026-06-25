"use client";

import { useState, type ReactNode } from "react";

import { MusicDrawer } from "./music-drawer";
import { OceanBackground } from "./ocean-background";

const title = "\u6f6e\u6c50\u65f6\u5149";
const enableMotionLabel = "\u542f\u7528\u52a8\u6001\u80cc\u666f";
const disableMotionLabel = "\u5173\u95ed\u52a8\u6001\u80cc\u666f";
const footerCopy = "\u542c\u6f6e \u00b7 \u547c\u5438 \u00b7 \u4e13\u6ce8\u5f53\u4e0b";

export function AppShell({ children }: { children: ReactNode }) {
  const [motionEnabled, setMotionEnabled] = useState(false);

  return (
    <main className="relative isolate flex min-h-svh overflow-hidden text-white">
      <OceanBackground motionEnabled={motionEnabled} />
      <div className="relative z-10 flex min-h-svh w-full flex-col px-5 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-sm font-medium tracking-[0.3em] text-white/85 sm:text-base">{title}</h1>
          <div className="flex items-center gap-3">
            <MusicDrawer />
            <button
              aria-pressed={motionEnabled}
              className="rounded-full border border-white/25 bg-black/10 px-4 py-2 text-xs tracking-wide text-white/80 backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              onClick={() => setMotionEnabled((enabled) => !enabled)}
              type="button"
            >
              {motionEnabled ? disableMotionLabel : enableMotionLabel}
            </button>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center py-12">{children}</div>
        <p className="text-center text-[0.65rem] tracking-[0.28em] text-white/55">{footerCopy}</p>
      </div>
    </main>
  );
}
