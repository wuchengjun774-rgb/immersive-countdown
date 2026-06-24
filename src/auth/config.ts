import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";

import { canRequestOtp, createOtpCode, hashOtp, isOtpValid, OTP_REQUEST_COOLDOWN_MS } from "./otp";
import { wechatProvider } from "./wechat-provider";

type EmailOtpEntry = {
  codeHash: string;
  createdAt: number;
  lastSentAt: number;
};

type EmailOtpRequestResult = {
  delivered: boolean;
  ok: boolean;
  normalizedEmail: string;
  retryAfterMs?: number;
};

declare global {
  var emailOtpStore: Map<string, EmailOtpEntry> | undefined;
}

const emailOtpStore = globalThis.emailOtpStore ?? new Map<string, EmailOtpEntry>();

if (process.env.NODE_ENV !== "production") {
  globalThis.emailOtpStore = emailOtpStore;
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeOtp(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function deliverOtpEmail(email: string, code: string) {
  const endpoint = process.env.EMAIL_OTP_ENDPOINT?.trim();

  if (!endpoint) {
    return false;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.EMAIL_OTP_API_KEY?.trim();

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: email,
      code,
      from: process.env.EMAIL_OTP_FROM ?? "no-reply@example.invalid",
      subject: "Your immersive countdown login code",
    }),
  }).catch(() => null);

  return response?.ok ?? false;
}

export async function requestEmailOtp(rawEmail: unknown, now = Date.now()): Promise<EmailOtpRequestResult> {
  const normalizedEmail = normalizeEmail(rawEmail);

  if (!normalizedEmail) {
    return {
      delivered: false,
      ok: false,
      normalizedEmail: "",
    };
  }

  const current = emailOtpStore.get(normalizedEmail);

  if (current && !canRequestOtp(current.lastSentAt, now)) {
    return {
      delivered: false,
      ok: false,
      normalizedEmail,
      retryAfterMs: OTP_REQUEST_COOLDOWN_MS - (now - current.lastSentAt),
    };
  }

  const code = createOtpCode();

  emailOtpStore.set(normalizedEmail, {
    codeHash: hashOtp(code),
    createdAt: now,
    lastSentAt: now,
  });

  const delivered = await deliverOtpEmail(normalizedEmail, code);

  return {
    delivered,
    ok: true,
    normalizedEmail,
  };
}

const emailOtpProvider = Credentials({
  id: "email-otp",
  name: "Email OTP",
  credentials: {
    email: { label: "Email", type: "email" },
    code: { label: "Verification code", type: "text" },
  },
  async authorize(credentials) {
    const email = normalizeEmail(credentials?.email);
    const code = normalizeOtp(credentials?.code);

    if (!email || !code) {
      return null;
    }

    const record = emailOtpStore.get(email);

    if (!record || !isOtpValid(record, code, Date.now())) {
      return null;
    }

    emailOtpStore.delete(email);

    const user = await prisma.user.upsert({
      where: { email },
      update: { email },
      create: { email },
    });

    return {
      id: user.id,
      email: user.email ?? email,
      name: user.email ?? email,
    };
  },
});

const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "development-auth-secret-placeholder",
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  providers: [emailOtpProvider, wechatProvider],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
