import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import Page from "./page";

afterEach(() => {
  cleanup();
});

test("renders the product name", () => {
  render(<Page />);

  expect(screen.getByRole("heading", { name: "潮汐时光" })).toBeTruthy();
});

test("renders the timer and dynamic background toggle", () => {
  render(<Page />);

  expect(screen.getByRole("button", { name: "开始专注" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "启用动态背景" })).toBeTruthy();
});
