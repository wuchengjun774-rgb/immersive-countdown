import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockAuth, mockFindUserIdByEmail, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUserIdByEmail: vi.fn(),
  mockPrisma: {
    userSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/auth/config", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/session-repository", () => ({
  findUserIdByEmail: mockFindUserIdByEmail,
}));

import { GET, PUT } from "./route";

const defaultSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  rounds: 4,
  motionBackground: false,
};

describe("/api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockFindUserIdByEmail.mockResolvedValue(null);
  });

  test("returns default settings when no trusted user identity is present", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: defaultSettings,
      persisted: false,
      requiresUserIdentity: true,
    });
    expect(mockPrisma.userSettings.findUnique).not.toHaveBeenCalled();
  });

  test("ignores untrusted x-user-id on GET and never loads persisted settings", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: defaultSettings,
      persisted: false,
      requiresUserIdentity: true,
    });
    expect(mockPrisma.userSettings.findUnique).not.toHaveBeenCalled();
  });

  test("loads persisted settings for an authenticated user id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrisma.userSettings.findUnique.mockResolvedValue({
      id: "settings-1",
      userId: "user-123",
      focusMinutes: 50,
      breakMinutes: 8,
      rounds: 5,
      motionBackground: true,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: {
        focusMinutes: 50,
        breakMinutes: 8,
        rounds: 5,
        motionBackground: true,
      },
      persisted: true,
      requiresUserIdentity: false,
    });
    expect(mockPrisma.userSettings.findUnique).toHaveBeenCalledWith({ where: { userId: "user-123" } });
  });

  test("falls back to authenticated email when auth user id is unavailable", async () => {
    mockAuth.mockResolvedValue({ user: { email: "person@example.com" } });
    mockFindUserIdByEmail.mockResolvedValue("user-email");
    mockPrisma.userSettings.findUnique.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mockFindUserIdByEmail).toHaveBeenCalledWith("person@example.com");
    expect(mockPrisma.userSettings.findUnique).toHaveBeenCalledWith({ where: { userId: "user-email" } });
  });

  test("rejects invalid settings payloads before any persistence attempt", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });

    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          focusMinutes: 0,
          breakMinutes: 5,
          rounds: 4,
          motionBackground: false,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid settings payload",
    });
    expect(mockPrisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  test("rejects valid settings payloads without trusted authentication even when x-user-id is present", async () => {
    const payload = {
      focusMinutes: 50,
      breakMinutes: 8,
      rounds: 5,
      motionBackground: true,
    };

    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-user-id": "user-123",
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication is required to persist settings",
      requiresUserIdentity: true,
    });
    expect(mockPrisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  test("upserts valid settings for an authenticated user", async () => {
    const payload = {
      focusMinutes: 40,
      breakMinutes: 10,
      rounds: 6,
      motionBackground: true,
    };

    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockPrisma.userSettings.upsert.mockResolvedValue({
      id: "settings-1",
      userId: "user-123",
      ...payload,
    });

    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: payload,
      persisted: true,
      requiresUserIdentity: false,
    });
    expect(mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      update: payload,
      create: {
        userId: "user-123",
        ...payload,
      },
    });
  });
});
