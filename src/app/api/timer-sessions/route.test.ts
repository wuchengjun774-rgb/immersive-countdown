import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockAuth, mockFindUserIdByEmail, mockSaveTimerSession } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUserIdByEmail: vi.fn(),
  mockSaveTimerSession: vi.fn(),
}));

vi.mock("@/auth/config", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/session-repository", () => ({
  findUserIdByEmail: mockFindUserIdByEmail,
  saveTimerSession: mockSaveTimerSession,
}));

import { POST } from "./route";

describe("/api/timer-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/timer-sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": "forged-user",
        },
        body: JSON.stringify({
          syncKey: "sync-1",
          mode: "focus",
          startedAt: "2026-06-24T12:00:00.000Z",
          endedAt: "2026-06-24T12:25:00.000Z",
          durationMs: 1_500_000,
          interrupted: false,
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication is required to persist timer sessions",
      requiresUserIdentity: true,
    });
    expect(mockSaveTimerSession).not.toHaveBeenCalled();
  });

  test("rejects invalid payloads before persistence", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const response = await POST(
      new Request("http://localhost/api/timer-sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          syncKey: "",
          mode: "other",
          startedAt: "invalid",
          endedAt: "invalid",
          durationMs: -1,
          interrupted: "nope",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid timer session payload",
    });
    expect(mockSaveTimerSession).not.toHaveBeenCalled();
  });

  test("persists the session for the authenticated user id from auth instead of request headers", async () => {
    mockAuth.mockResolvedValue({ user: { id: "trusted-user" } });

    const response = await POST(
      new Request("http://localhost/api/timer-sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": "forged-user",
        },
        body: JSON.stringify({
          syncKey: "sync-1",
          mode: "focus",
          startedAt: "2026-06-24T12:00:00.000Z",
          endedAt: "2026-06-24T12:25:00.000Z",
          durationMs: 1_500_000,
          interrupted: false,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ acknowledged: true });
    expect(mockSaveTimerSession).toHaveBeenCalledWith({
      userId: "trusted-user",
      syncKey: "sync-1",
      mode: "focus",
      startedAt: "2026-06-24T12:00:00.000Z",
      endedAt: "2026-06-24T12:25:00.000Z",
      durationMs: 1_500_000,
      interrupted: false,
    });
  });

  test("falls back to the authenticated email when auth user id is unavailable", async () => {
    mockAuth.mockResolvedValue({ user: { email: "timer@example.com" } });
    mockFindUserIdByEmail.mockResolvedValue("email-user");

    const response = await POST(
      new Request("http://localhost/api/timer-sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          syncKey: "sync-2",
          mode: "leisure",
          startedAt: "2026-06-24T12:25:00.000Z",
          endedAt: "2026-06-24T12:30:00.000Z",
          durationMs: 300_000,
          interrupted: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ acknowledged: true });
    expect(mockFindUserIdByEmail).toHaveBeenCalledWith("timer@example.com");
    expect(mockSaveTimerSession).toHaveBeenCalledWith({
      userId: "email-user",
      syncKey: "sync-2",
      mode: "leisure",
      startedAt: "2026-06-24T12:25:00.000Z",
      endedAt: "2026-06-24T12:30:00.000Z",
      durationMs: 300_000,
      interrupted: true,
    });
  });
});
