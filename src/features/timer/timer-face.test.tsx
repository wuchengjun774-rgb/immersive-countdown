import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { TimerFace } from "./timer-face";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

test("exposes mode and timer controls by name", () => {
  render(<TimerFace />);

  expect(screen.getByRole("button", { name: "开始专注" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "休闲模式" })).toBeTruthy();
  expect(screen.getByRole("timer").textContent).toBe("25:00");
});

test("switches to a leisure countdown", () => {
  render(<TimerFace />);

  fireEvent.click(screen.getByRole("tab", { name: "休闲模式" }));

  expect(screen.getByRole("tab", { name: "休闲模式" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("button", { name: "开始休闲计时" })).toBeTruthy();
});

test("starts, pauses, and resumes the countdown", () => {
  render(<TimerFace />);

  fireEvent.click(screen.getByRole("button", { name: "开始专注" }));
  fireEvent.click(screen.getByRole("button", { name: "暂停" }));

  expect(screen.getByRole("button", { name: "恢复" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "恢复" }));

  expect(screen.getByRole("button", { name: "暂停" })).toBeTruthy();
});

test("supports keyboard navigation and roving focus for tabs", () => {
  render(<TimerFace />);

  const focusTab = screen.getByRole("tab", { name: "专注模式" });
  const leisureTab = screen.getByRole("tab", { name: "休闲模式" });

  expect(focusTab.getAttribute("tabindex")).toBe("0");
  expect(leisureTab.getAttribute("tabindex")).toBe("-1");

  focusTab.focus();
  fireEvent.keyDown(focusTab, { key: "ArrowRight" });

  expect(document.activeElement).toBe(leisureTab);
  expect(leisureTab.getAttribute("aria-selected")).toBe("true");
  expect(leisureTab.getAttribute("tabindex")).toBe("0");
  expect(focusTab.getAttribute("tabindex")).toBe("-1");
});

test("supports reverse and vertical arrow navigation for tabs", () => {
  render(<TimerFace />);

  const [focusTab, leisureTab] = screen.getAllByRole("tab");

  focusTab.focus();
  fireEvent.keyDown(focusTab, { key: "ArrowDown" });

  expect(document.activeElement).toBe(leisureTab);
  expect(leisureTab.getAttribute("aria-selected")).toBe("true");

  fireEvent.keyDown(leisureTab, { key: "ArrowLeft" });

  expect(document.activeElement).toBe(focusTab);
  expect(focusTab.getAttribute("aria-selected")).toBe("true");

  fireEvent.keyDown(focusTab, { key: "ArrowUp" });

  expect(document.activeElement).toBe(leisureTab);
  expect(leisureTab.getAttribute("aria-selected")).toBe("true");
});

test("supports Home and End keyboard shortcuts for tabs", () => {
  render(<TimerFace />);

  const [focusTab, leisureTab] = screen.getAllByRole("tab");

  leisureTab.focus();
  fireEvent.keyDown(leisureTab, { key: "Home" });

  expect(document.activeElement).toBe(focusTab);
  expect(focusTab.getAttribute("aria-selected")).toBe("true");
  expect(focusTab.getAttribute("tabindex")).toBe("0");
  expect(leisureTab.getAttribute("tabindex")).toBe("-1");

  fireEvent.keyDown(focusTab, { key: "End" });

  expect(document.activeElement).toBe(leisureTab);
  expect(leisureTab.getAttribute("aria-selected")).toBe("true");
  expect(leisureTab.getAttribute("tabindex")).toBe("0");
  expect(focusTab.getAttribute("tabindex")).toBe("-1");
});

test("links each tab to its tabpanel", () => {
  render(<TimerFace />);

  const focusTab = screen.getByRole("tab", { name: "专注模式" });
  const panel = screen.getByRole("tabpanel");

  expect(focusTab.getAttribute("aria-controls")).toBe(panel.getAttribute("id"));
  expect(panel.getAttribute("aria-labelledby")).toBe(focusTab.getAttribute("id"));
});
