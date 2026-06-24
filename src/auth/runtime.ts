import { createHash } from "node:crypto";

export type AuthUnavailableReason = "missing-secret";

export type AuthRuntimeState = {
  authAvailable: boolean;
  authUnavailableReason: AuthUnavailableReason | null;
  emailOtpEnabled: boolean;
  secret: string;
  wechatEnabled: boolean;
};

function readTrimmedEnv(
  env: NodeJS.ProcessEnv,
  name: "AUTH_SECRET" | "NEXTAUTH_SECRET" | "EMAIL_OTP_ENDPOINT" | "WECHAT_CLIENT_ID" | "WECHAT_CLIENT_SECRET",
) {
  const value = env[name]?.trim();

  return value && value.length > 0 ? value : null;
}

function buildEphemeralSecret(env: NodeJS.ProcessEnv) {
  return createHash("sha256")
    .update([
      env.NODE_ENV ?? "development",
      env.VERCEL_URL ?? "",
      env.HOSTNAME ?? "",
      process.cwd(),
    ].join(":"))
    .digest("hex");
}

export function resolveAuthRuntimeState(env: NodeJS.ProcessEnv = process.env): AuthRuntimeState {
  const secret = readTrimmedEnv(env, "AUTH_SECRET") ?? readTrimmedEnv(env, "NEXTAUTH_SECRET");
  const isProduction = env.NODE_ENV === "production";
  const authAvailable = Boolean(secret) || !isProduction;
  const resolvedSecret = secret ?? buildEphemeralSecret(env);
  const emailOtpEnabled = authAvailable && Boolean(readTrimmedEnv(env, "EMAIL_OTP_ENDPOINT"));
  const wechatEnabled =
    authAvailable &&
    Boolean(readTrimmedEnv(env, "WECHAT_CLIENT_ID")) &&
    Boolean(readTrimmedEnv(env, "WECHAT_CLIENT_SECRET"));

  return {
    authAvailable,
    authUnavailableReason: authAvailable ? null : "missing-secret",
    emailOtpEnabled,
    secret: resolvedSecret,
    wechatEnabled,
  };
}
