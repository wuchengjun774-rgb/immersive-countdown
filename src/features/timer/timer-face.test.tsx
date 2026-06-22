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
