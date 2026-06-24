import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("next-auth", () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials";
    type = "CredentialsSignin";
  },
}));

let authorizeEmailOtpSignIn: typeof import("./email-otp-sign-in").authorizeEmailOtpSignIn;
let ExpiredEmailOtpError: typeof import("./email-otp-sign-in").ExpiredEmailOtpError;
let getLoginRedirectForAuthError: typeof import("./email-otp-sign-in").getLoginRedirectForAuthError;

beforeAll(async () => {
  ({
    authorizeEmailOtpSignIn,
    ExpiredEmailOtpError,
    getLoginRedirectForAuthError,
  } = await import("./email-otp-sign-in"));
});

describe("authorizeEmailOtpSignIn", () => {
  test("throws a credentials error with an expired code marker when the otp is expired", async () => {
    const upsertUser = vi.fn();

    await expect(
      authorizeEmailOtpSignIn(
        {
          email: "person@example.com",
          code: "123456",
        },
        {
          authAvailable: true,
          consumeOtp: vi.fn().mockResolvedValue({ status: "expired" }),
          upsertUser,
        },
      ),
    ).rejects.toMatchObject({
      code: "expired",
      type: "CredentialsSignin",
    });

    expect(upsertUser).not.toHaveBeenCalled();
  });

  test("keeps invalid codes on the generic credentials path", async () => {
    const upsertUser = vi.fn();

    await expect(
      authorizeEmailOtpSignIn(
        {
          email: "person@example.com",
          code: "123456",
        },
        {
          authAvailable: true,
          consumeOtp: vi.fn().mockResolvedValue({ status: "invalid" }),
          upsertUser,
        },
      ),
    ).resolves.toBeNull();

    expect(upsertUser).not.toHaveBeenCalled();
  });

  test("returns the normalized user for verified codes", async () => {
    const upsertUser = vi.fn().mockResolvedValue({
      email: "person@example.com",
      id: "user_123",
    });

    await expect(
      authorizeEmailOtpSignIn(
        {
          email: " Person@example.com ",
          code: "123456",
        },
        {
          authAvailable: true,
          consumeOtp: vi.fn().mockResolvedValue({ status: "verified" }),
          upsertUser,
        },
      ),
    ).resolves.toEqual({
      email: "person@example.com",
      id: "user_123",
      name: "person@example.com",
    });

    expect(upsertUser).toHaveBeenCalledWith("person@example.com");
  });
});

describe("getLoginRedirectForAuthError", () => {
  test("routes expired credentials sign-ins to the explicit expired login state", () => {
    expect(getLoginRedirectForAuthError(new ExpiredEmailOtpError())).toBe("/login?status=expired");
  });

  test("keeps invalid credentials sign-ins on the generic invalid-code path", () => {
    expect(
      getLoginRedirectForAuthError({
        type: "CredentialsSignin",
      }),
    ).toBe("/login?error=CredentialsSignin");
  });
});
