import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Page from "./page";

test("renders the product name", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { name: "潮汐时光" })).toBeTruthy();
});
