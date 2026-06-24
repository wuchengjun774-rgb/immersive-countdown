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

  test("loads persisted settings for the requested user", async () => {
    mockPrisma.userSettings.findUnique.mockResolvedValue({
      focusMinutes: 45,
      breakMinutes: 10,
      rounds: 6,
      motionBackground: true,
    });

    const request = new Request("http://localhost/api/settings", {
      headers: {
        "x-user-id": "user-123",
      },
    });

    const response = await GET(request);

    expect(mockPrisma.userSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      select: {
        focusMinutes: true,
        breakMinutes: true,
        rounds: true,
        motionBackground: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      settings: {
        focusMinutes: 45,
        breakMinutes: 10,
        rounds: 6,
        motionBackground: true,
      },
      persisted: true,
      requiresUserIdentity: false,
    });
  });

  test("rejects invalid settings payloads", async () => {
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
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });

  test("persists valid settings for the requested user", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      settings: {
        focusMinutes: 50,
        breakMinutes: 8,
        rounds: 5,
        motionBackground: true,
      },
    });

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

    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-123" },
      create: {
        id: "user-123",
        settings: {
          create: payload,
        },
      },
      update: {
        settings: {
          upsert: {
            create: payload,
            update: payload,
          },
        },
      },
      select: {
        settings: {
          select: {
            focusMinutes: true,
            breakMinutes: true,
            rounds: true,
            motionBackground: true,
          },
        },
      },
    });
    await expect(response.json()).resolves.toEqual({
      settings: payload,
      persisted: true,
      requiresUserIdentity: false,
    });
  });
});
