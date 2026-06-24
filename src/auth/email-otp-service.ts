import { createOtpCode, hashOtp, isOtpValid, OTP_REQUEST_COOLDOWN_MS, OTP_VALIDITY_MS } from "./otp";

export type EmailOtpRecord = {
  codeHash: string;
  email: string;
  expiresAt: Date;
  lastSentAt: Date;
};

export type EmailOtpStore = {
  delete(email: string): Promise<void>;
  getByEmail(email: string): Promise<EmailOtpRecord | null>;
  save(record: EmailOtpRecord): Promise<void>;
};

export type EmailOtpRequestResult = {
  delivered: boolean;
  normalizedEmail: string;
  ok: boolean;
  retryAfterMs?: number;
  status:
    | "auth-unavailable"
    | "code-sent"
    | "delivery-failed"
    | "invalid-email"
    | "not-configured"
    | "rate-limited";
};

export type ConsumeEmailOtpResult = {
  email?: string;
  status: "expired" | "invalid" | "verified";
};

type RequestEmailOtpOptions = {
  deliverOtpEmail(email: string, code: string): Promise<boolean>;
  now?: number;
  runtime: {
    authAvailable: boolean;
    emailOtpEnabled: boolean;
  };
  store: EmailOtpStore;
};

type ConsumeEmailOtpOptions = {
  now?: number;
  store: EmailOtpStore;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeOtp(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function calculateRetryAfterMs(lastSentAt: Date, now: number) {
  return Math.max(0, OTP_REQUEST_COOLDOWN_MS - (now - lastSentAt.getTime()));
}

export async function requestEmailOtp(
  rawEmail: unknown,
  { deliverOtpEmail, now = Date.now(), runtime, store }: RequestEmailOtpOptions,
): Promise<EmailOtpRequestResult> {
  const normalizedEmail = normalizeEmail(rawEmail);

  if (!normalizedEmail) {
    return {
      delivered: false,
      normalizedEmail: "",
      ok: false,
      status: "invalid-email",
    };
  }

  if (!runtime.authAvailable) {
    return {
      delivered: false,
      normalizedEmail,
      ok: false,
      status: "auth-unavailable",
    };
  }

  if (!runtime.emailOtpEnabled) {
    return {
      delivered: false,
      normalizedEmail,
      ok: false,
      status: "not-configured",
    };
  }

  const current = await store.getByEmail(normalizedEmail);

  if (current) {
    const retryAfterMs = calculateRetryAfterMs(current.lastSentAt, now);

    if (retryAfterMs > 0) {
      return {
        delivered: false,
        normalizedEmail,
        ok: false,
        retryAfterMs,
        status: "rate-limited",
      };
    }
  }

  const code = createOtpCode();
  const delivered = await deliverOtpEmail(normalizedEmail, code);

  if (!delivered) {
    return {
      delivered: false,
      normalizedEmail,
      ok: false,
      status: "delivery-failed",
    };
  }

  await store.save({
    codeHash: hashOtp(code),
    email: normalizedEmail,
    expiresAt: new Date(now + OTP_VALIDITY_MS),
    lastSentAt: new Date(now),
  });

  return {
    delivered: true,
    normalizedEmail,
    ok: true,
    status: "code-sent",
  };
}

export async function consumeEmailOtp(
  rawEmail: unknown,
  rawCode: unknown,
  { now = Date.now(), store }: ConsumeEmailOtpOptions,
): Promise<ConsumeEmailOtpResult> {
  const email = normalizeEmail(rawEmail);
  const code = normalizeOtp(rawCode);

  if (!email || !code) {
    return { status: "invalid" };
  }

  const record = await store.getByEmail(email);

  if (!record) {
    return { status: "invalid" };
  }

  if (record.expiresAt.getTime() < now) {
    await store.delete(email);

    return { status: "expired" };
  }

  if (!isOtpValid({ codeHash: record.codeHash, createdAt: record.lastSentAt.getTime() }, code, now)) {
    return { status: "invalid" };
  }

  await store.delete(email);

  return {
    email,
    status: "verified",
  };
}
