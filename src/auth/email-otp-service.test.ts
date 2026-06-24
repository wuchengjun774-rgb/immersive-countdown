import { describe, expect, test, vi } from "vitest";

import { OTP_REQUEST_COOLDOWN_MS, OTP_VALIDITY_MS } from "./otp";
import { consumeEmailOtp, requestEmailOtp, type EmailOtpStore } from "./email-otp-service";

function createStore(initialRecord?: {
  codeHash: string;
  email: string;
  expiresAt: Date;
  lastSentAt: Date;
}) {
  let record = initialRecord ?? null;

  const store: EmailOtpStore = {
    async delete(email) {
      if (record?.email === email) {
        record = null;
      }
    },
    async getByEmail(email) {
      return record?.email === email ? record : null;
    },
    async save(nextRecord) {
      record = nextRecord;
    },
  };

  return {
    getRecord: () => record,
    store,
  };
}

describe("requestEmailOtp", () => {
  test("returns not-configured when delivery cannot be attempted", async () => {
    const { store, getRecord } = createStore();

    await expect(
      requestEmailOtp("person@example.com", {
        deliverOtpEmail: vi.fn(),
        runtime: {
          authAvailable: true,
          emailOtpEnabled: false,
        },
        store,
      }),
    ).resolves.toMatchObject({
      delivered: false,
      ok: false,
      status: "not-configured",
    });

    expect(getRecord()).toBeNull();
  });

  test("does not report code sent when delivery fails", async () => {
    const deliverOtpEmail = vi.fn().mockResolvedValue(false);
    const { store, getRecord } = createStore();

    await expect(
      requestEmailOtp("person@example.com", {
        deliverOtpEmail,
        runtime: {
          authAvailable: true,
          emailOtpEnabled: true,
        },
        store,
      }),
    ).resolves.toMatchObject({
      delivered: false,
      ok: false,
      status: "delivery-failed",
    });

    expect(deliverOtpEmail).toHaveBeenCalledOnce();
    expect(getRecord()).toBeNull();
  });

  test("persists the otp record after a successful delivery", async () => {
    const { store, getRecord } = createStore();
    const now = 1_000;

    await expect(
      requestEmailOtp("person@example.com", {
        deliverOtpEmail: vi.fn().mockResolvedValue(true),
        now,
        runtime: {
          authAvailable: true,
          emailOtpEnabled: true,
        },
        store,
      }),
    ).resolves.toMatchObject({
      delivered: true,
      ok: true,
      status: "code-sent",
    });

    expect(getRecord()).toMatchObject({
      email: "person@example.com",
      lastSentAt: new Date(now),
    });
  });

  test("keeps invalid email and rate limiting as separate outcomes", async () => {
    const { store } = createStore({
      codeHash: "hash",
      email: "person@example.com",
      expiresAt: new Date(OTP_VALIDITY_MS),
      lastSentAt: new Date(0),
    });

    await expect(
      requestEmailOtp("", {
        deliverOtpEmail: vi.fn(),
        runtime: {
          authAvailable: true,
          emailOtpEnabled: true,
        },
        store,
      }),
    ).resolves.toMatchObject({
      ok: false,
      status: "invalid-email",
    });

    await expect(
      requestEmailOtp("person@example.com", {
        deliverOtpEmail: vi.fn(),
        now: OTP_REQUEST_COOLDOWN_MS - 1,
        runtime: {
          authAvailable: true,
          emailOtpEnabled: true,
        },
        store,
      }),
    ).resolves.toMatchObject({
      ok: false,
      status: "rate-limited",
    });
  });
});

describe("consumeEmailOtp", () => {
  test("returns expired when a persisted otp is older than the validity window", async () => {
    const { store, getRecord } = createStore({
      codeHash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
      email: "person@example.com",
      expiresAt: new Date(OTP_VALIDITY_MS),
      lastSentAt: new Date(0),
    });

    await expect(
      consumeEmailOtp("person@example.com", "123456", {
        now: OTP_VALIDITY_MS + 1,
        store,
      }),
    ).resolves.toMatchObject({
      status: "expired",
    });

    expect(getRecord()).toBeNull();
  });
});
