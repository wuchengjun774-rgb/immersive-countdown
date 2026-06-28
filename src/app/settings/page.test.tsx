import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockAuth, mockSignOut } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("@/auth/config", () => ({
  auth: mockAuth,
  signOut: mockSignOut,
}));

vi.mock("@/app/api/account/route", () => ({
  DELETE: vi.fn(),
}));

import Page from "./page";

describe("/settings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  test("renders editable-looking preferences and account controls", async () => {
    render(await Page());

    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.getByLabelText("Countdown mode")).toBeTruthy();
    expect(screen.getByLabelText("Scene background")).toBeTruthy();
    expect(screen.getByLabelText("Reminder style")).toBeTruthy();
    expect(screen.getByLabelText("Music atmosphere")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete personal data" })).toBeTruthy();
    expect(screen.getByText("Preference sync still requires authenticated persistence support.")).toBeTruthy();
  });
});
