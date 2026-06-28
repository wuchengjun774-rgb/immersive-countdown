import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockAuth, mockPrismaUserDelete, mockFindUserIdByEmail } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrismaUserDelete: vi.fn(),
  mockFindUserIdByEmail: vi.fn(),
}));

vi.mock("@/auth/config", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      delete: mockPrismaUserDelete,
    },
  },
}));

vi.mock("@/lib/session-repository", () => ({
  findUserIdByEmail: mockFindUserIdByEmail,
}));

import { DELETE } from "./route";

describe("/api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated delete requests", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-user-id": "forged-user",
        },
        body: JSON.stringify({
          userId: "forged-user",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication is required to delete this account",
      requiresUserIdentity: true,
    });
    expect(mockPrismaUserDelete).not.toHaveBeenCalled();
  });

  test("deletes only the authenticated user id and ignores caller-controlled ids", async () => {
    mockAuth.mockResolvedValue({ user: { id: "trusted-user" } });
    mockPrismaUserDelete.mockResolvedValue({ id: "trusted-user" });

    const response = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-user-id": "forged-user",
        },
        body: JSON.stringify({
          userId: "forged-user",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true });
    expect(mockPrismaUserDelete).toHaveBeenCalledWith({
      where: {
        id: "trusted-user",
      },
    });
  });

  test("falls back to the authenticated email when auth user id is unavailable", async () => {
    mockAuth.mockResolvedValue({ user: { email: "timer@example.com" } });
    mockFindUserIdByEmail.mockResolvedValue("email-user");
    mockPrismaUserDelete.mockResolvedValue({ id: "email-user" });

    const response = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "forged-user",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true });
    expect(mockFindUserIdByEmail).toHaveBeenCalledWith("timer@example.com");
    expect(mockPrismaUserDelete).toHaveBeenCalledWith({
      where: {
        id: "email-user",
      },
    });
  });

  test("returns a safe unavailable response when account deletion cannot complete", async () => {
    mockAuth.mockRejectedValue(new Error("auth offline"));

    const response = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Account deletion is temporarily unavailable",
      retryable: true,
    });
    expect(mockPrismaUserDelete).not.toHaveBeenCalled();
  });
});
