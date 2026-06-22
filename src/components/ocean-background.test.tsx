import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { OceanBackground } from "./ocean-background";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

function setLegacyReducedMotion(matches: boolean) {
  const addListener = vi.fn();
  const removeListener = vi.fn();

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      addListener,
      removeListener,
    }),
  );

  return { addListener, removeListener };
}

test("does not render video when motion is disabled", () => {
  setReducedMotion(false);
  render(<OceanBackground motionEnabled={false} />);

  expect(screen.queryByTestId("ocean-video")).toBeNull();
  expect(screen.getByTestId("ocean-background").style.backgroundImage).toContain("morning-ocean.webp");
});

test("does not render video when the user prefers reduced motion", () => {
  setReducedMotion(true);
  render(<OceanBackground motionEnabled />);

  expect(screen.queryByTestId("ocean-video")).toBeNull();
});

test("falls back to the static background after a video error", () => {
  setReducedMotion(false);
  render(<OceanBackground motionEnabled />);

  fireEvent.error(screen.getByTestId("ocean-video"));

  expect(screen.queryByTestId("ocean-video")).toBeNull();
  expect(screen.getByTestId("ocean-background").style.backgroundImage).toContain("morning-ocean.webp");
});

test("supports legacy safari matchMedia listeners", () => {
  const { addListener, removeListener } = setLegacyReducedMotion(false);
  const { unmount } = render(<OceanBackground motionEnabled />);

  expect(addListener).toHaveBeenCalledTimes(1);

  unmount();

  expect(removeListener).toHaveBeenCalledTimes(1);
});
