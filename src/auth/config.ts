import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";

import { consumeEmailOtp, normalizeOtp, requestEmailOtp as requestEmailOtpWithStore, type EmailOtpRecord } from "./email-otp-service";
import { resolveAuthRuntimeState } from "./runtime";
import { wechatProvider } from "./wechat-provider";

export const authRuntimeState = resolveAuthRuntimeState();

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

const emailOtpStore = {
  async delete(email: string) {
    await prisma.emailOtpChallenge.deleteMany({
      where: { email },
    });
  },
  async getByEmail(email: string): Promise<EmailOtpRecord | null> {
    const record = await prisma.emailOtpChallenge.findUnique({
      where: { email },
    });

    if (!record) {
      return null;
    }

    return {
      codeHash: record.codeHash,
      email: record.email,
      expiresAt: record.expiresAt,
      lastSentAt: record.lastSentAt,
    };
  },
  async save(record: EmailOtpRecord) {
    await prisma.emailOtpChallenge.upsert({
      where: { email: record.email },
      update: {
        codeHash: record.codeHash,
        expiresAt: record.expiresAt,
        lastSentAt: record.lastSentAt,
      },
      create: record,
    });
  },
};

export async function requestEmailOtp(rawEmail: unknown, now = Date.now()) {
  return requestEmailOtpWithStore(rawEmail, {
    deliverOtpEmail,
    now,
    runtime: authRuntimeState,
    store: emailOtpStore,
  });
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

    if (!email || !code || !authRuntimeState.authAvailable) {
      return null;
    }

    const result = await consumeEmailOtp(email, code, {
      now: Date.now(),
      store: emailOtpStore,
    });

    if (result.status !== "verified") {
      return null;
    }

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
  secret: authRuntimeState.secret,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  providers: [emailOtpProvider, wechatProvider].filter((provider) => provider != null),
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
