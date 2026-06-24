import { describe, expect, test } from "vitest";

import { resolveAuthRuntimeState } from "./runtime";

describe("resolveAuthRuntimeState", () => {
  test("fails closed in production when no auth secret is configured", () => {
    const runtime = resolveAuthRuntimeState({
      NODE_ENV: "production",
    });

    expect(runtime.authAvailable).toBe(false);
    expect(runtime.authUnavailableReason).toBe("missing-secret");
    expect(runtime.secret).toBeTruthy();
    expect(runtime.secret).not.toBe("development-auth-secret-placeholder");
    expect(runtime.emailOtpEnabled).toBe(false);
    expect(runtime.wechatEnabled).toBe(false);
  });

  test("keeps auth available in development with mock-safe defaults", () => {
    const runtime = resolveAuthRuntimeState({
      NODE_ENV: "development",
    });

    expect(runtime.authAvailable).toBe(true);
    expect(runtime.authUnavailableReason).toBeNull();
    expect(runtime.secret).toBeTruthy();
    expect(runtime.secret).not.toBe("development-auth-secret-placeholder");
  });

  test("requires endpoint and secret for email otp, and wechat credentials for wechat auth", () => {
    const runtime = resolveAuthRuntimeState({
      NODE_ENV: "production",
      AUTH_SECRET: "test-secret",
      EMAIL_OTP_ENDPOINT: "https://example.com/otp",
      WECHAT_CLIENT_ID: "wechat-client-id",
      WECHAT_CLIENT_SECRET: "wechat-client-secret",
    });

    expect(runtime.authAvailable).toBe(true);
    expect(runtime.emailOtpEnabled).toBe(true);
    expect(runtime.wechatEnabled).toBe(true);
  });

  test("does not enable credentials-only email otp with database sessions", () => {
    const runtime = resolveAuthRuntimeState({
      NODE_ENV: "production",
      AUTH_SECRET: "test-secret",
      EMAIL_OTP_ENDPOINT: "https://example.com/otp",
    });

    expect(runtime.authAvailable).toBe(true);
    expect(runtime.wechatEnabled).toBe(false);
    expect(runtime.emailOtpEnabled).toBe(false);
  });
});
