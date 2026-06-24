import { describe, expect, test } from "vitest";

import {
  OTP_VALIDITY_MS,
  canRequestOtp,
  hashOtp,
  isOtpValid,
} from "./otp";

describe("hashOtp", () => {
  test("returns a deterministic sha256 hex digest", () => {
    expect(hashOtp("123456")).toBe(
      "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    );
  });
});

describe("isOtpValid", () => {
  test("accepts a matching otp inside the validity window", () => {
    expect(
      isOtpValid(
        { createdAt: 0, codeHash: hashOtp("123456") },
        "123456",
        OTP_VALIDITY_MS,
      ),
    ).toBe(true);
  });

  test("expires an otp after ten minutes", () => {
    expect(
      isOtpValid(
        { createdAt: 0, codeHash: hashOtp("123456") },
        "123456",
        OTP_VALIDITY_MS + 1,
      ),
    ).toBe(false);
  });

  test("returns false when the stored hash length is unexpected", () => {
    expect(
      isOtpValid(
        { createdAt: 0, codeHash: "short" },
        "123456",
        OTP_VALIDITY_MS,
      ),
    ).toBe(false);
  });
});

describe("canRequestOtp", () => {
  test("allows the first request when no prior send timestamp exists", () => {
    expect(canRequestOtp(null, 0)).toBe(true);
  });

  test("rate limits repeated requests within the cooldown window", () => {
    expect(canRequestOtp(0, 59_999)).toBe(false);
    expect(canRequestOtp(0, 60_000)).toBe(true);
  });
});
