"use client";

import { useEffect, useState } from "react";

function getInitialReducedMotionPreference() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function OceanBackground({ motionEnabled }: { motionEnabled: boolean }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialReducedMotionPreference);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event?: MediaQueryListEvent | MediaQueryList) =>
      setPrefersReducedMotion(event ? event.matches : mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);

      return () => mediaQuery.removeEventListener("change", updatePreference);
    }

    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(updatePreference);

      return () => mediaQuery.removeListener(updatePreference);
    }
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-cover bg-center"
      data-testid="ocean-background"
      style={{ backgroundImage: "url(/backgrounds/morning-ocean.webp)" }}
    >
      {motionEnabled && !prefersReducedMotion && !videoFailed ? (
        <video
          autoPlay
          className="h-full w-full object-cover"
          data-testid="ocean-video"
          loop
          muted
          onError={() => setVideoFailed(true)}
          playsInline
          src="/backgrounds/morning-ocean-loop.mp4"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,31,46,0.2)_0%,rgba(4,20,33,0.42)_55%,rgba(3,14,25,0.66)_100%)]" />
    </div>
  );
}
