import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { AppShell } from "./app-shell";

vi.mock("./ocean-background", () => ({
  OceanBackground: ({ motionEnabled }: { motionEnabled: boolean }) => (
    <div data-motion-enabled={motionEnabled ? "true" : "false"} data-testid="ocean-background" />
  ),
}));

test("toggles the dynamic background control", () => {
  render(
    <AppShell>
      <div>content</div>
    </AppShell>,
  );

  const toggle = screen.getByRole("button", { name: "启用动态背景" });
  expect(toggle.getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByTestId("ocean-background").getAttribute("data-motion-enabled")).toBe("false");

  fireEvent.click(toggle);

  expect(screen.getByRole("button", { name: "关闭动态背景" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByTestId("ocean-background").getAttribute("data-motion-enabled")).toBe("true");
});
