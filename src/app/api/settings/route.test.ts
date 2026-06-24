import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      upsert: vi.fn(),
    },
    userSettings: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { GET, PUT } from "./route";

describe("/api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns default settings when no user identity is provided", async () => {
    const response = await GET(new Request("http://localhost/api/settings"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: {
        focusMinutes: 25,
        breakMinutes: 5,
        rounds: 4,
        motionBackground: false,
      },
      persisted: false,
      requiresUserIdentity: true,
    });
    expect(mockPrisma.userSettings.findUnique).not.toHaveBeenCalled();
  });

  test("ignores untrusted x-user-id on GET and never loads persisted settings", async () => {
    const request = new Request("http://localhost/api/settings", {
      headers: {
        "x-user-id": "user-123",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: {
        focusMinutes: 25,
        breakMinutes: 5,
        rounds: 4,
        motionBackground: false,
      },
      persisted: false,
      requiresUserIdentity: true,
    });
    expect(mockPrisma.userSettings.findUnique).not.toHaveBeenCalled();
  });

  test("rejects invalid settings payloads before any persistence attempt", async () => {
    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-user-id": "user-123",
        },
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
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.userSettings.findUnique).not.toHaveBeenCalled();
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
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.userSettings.findUnique).not.toHaveBeenCalled();
  });

  test("rejects valid settings payloads without trusted authentication when no header is present", async () => {
    const payload = {
      focusMinutes: 40,
      breakMinutes: 10,
      rounds: 6,
      motionBackground: true,
    };

    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication is required to persist settings",
      requiresUserIdentity: true,
    });
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.userSettings.findUnique).not.toHaveBeenCalled();
  });
});
