import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockAuth, mockDeleteAuthenticatedAccount, mockRedirect, mockSignOut } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDeleteAuthenticatedAccount: vi.fn(),
  mockRedirect: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  mockSignOut: vi.fn(),
}));

vi.mock("@/auth/config", () => ({
  auth: mockAuth,
  signOut: mockSignOut,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/account-service", () => ({
  deleteAuthenticatedAccount: mockDeleteAuthenticatedAccount,
}));

import Page, { deleteAccountAction } from "./page";

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
    expect(screen.getByText("Preference sync is available after sign-in; this page previews the supported timer defaults.")).toBeTruthy();
  });

  test("redirects to an explicit safe status when delete requires authentication", async () => {
    mockDeleteAuthenticatedAccount.mockResolvedValue({ ok: false, reason: "unauthenticated" });

    await expect(deleteAccountAction()).rejects.toThrow("REDIRECT:/settings?status=delete-requires-auth");
    expect(mockRedirect).toHaveBeenCalledWith("/settings?status=delete-requires-auth");
  });

  test("redirects to an explicit safe status when delete is temporarily unavailable", async () => {
    mockDeleteAuthenticatedAccount.mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(deleteAccountAction()).rejects.toThrow("REDIRECT:/settings?status=delete-unavailable");
    expect(mockRedirect).toHaveBeenCalledWith("/settings?status=delete-unavailable");
  });
});
