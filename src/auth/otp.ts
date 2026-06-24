import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_VALIDITY_MS = 600_000;
export const OTP_REQUEST_COOLDOWN_MS = 60_000;

export type OtpRecord = {
  createdAt: number;
  codeHash: string;
};

export function createOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function isOtpValid(record: OtpRecord, code: string, now: number) {
  if (now - record.createdAt > OTP_VALIDITY_MS) {
    return false;
  }

  const storedHash = Buffer.from(record.codeHash, "utf8");
  const incomingHash = Buffer.from(hashOtp(code), "utf8");

  if (storedHash.length !== incomingHash.length) {
    return false;
  }

  return timingSafeEqual(storedHash, incomingHash);
}

export function canRequestOtp(lastSentAt: number | null | undefined, now: number) {
  if (lastSentAt == null) {
    return true;
  }

  return now - lastSentAt >= OTP_REQUEST_COOLDOWN_MS;
}
