import { CredentialsSignin } from "next-auth";

import { normalizeOtp, type ConsumeEmailOtpResult } from "./email-otp-service";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export class ExpiredEmailOtpError extends CredentialsSignin {
  code = "expired";
}

type AuthorizedEmailOtpUser = {
  email: string | null;
  id: string;
};

type AuthorizeEmailOtpSignInOptions = {
  authAvailable: boolean;
  consumeOtp: (
    email: string,
    code: string,
    options: { now: number },
  ) => Promise<ConsumeEmailOtpResult>;
  now?: () => number;
  upsertUser: (email: string) => Promise<AuthorizedEmailOtpUser>;
};

export async function authorizeEmailOtpSignIn(
  credentials: Record<string, unknown> | undefined,
  {
    authAvailable,
    consumeOtp,
    now = () => Date.now(),
    upsertUser,
  }: AuthorizeEmailOtpSignInOptions,
) {
  const email = normalizeEmail(credentials?.email);
  const code = normalizeOtp(credentials?.code);

  if (!email || !code || !authAvailable) {
    return null;
  }

  const result = await consumeOtp(email, code, {
    now: now(),
  });

  if (result.status === "expired") {
    throw new ExpiredEmailOtpError();
  }

  if (result.status !== "verified") {
    return null;
  }

  const user = await upsertUser(email);

  return {
    id: user.id,
    email: user.email ?? email,
    name: user.email ?? email,
  };
}

export function getLoginRedirectForAuthError(error: { type: string } & Partial<CredentialsSignin>) {
  if (error.type === "CredentialsSignin" && error.code === "expired") {
    return "/login?status=expired";
  }

  return `/login?error=${encodeURIComponent(error.type)}`;
}
