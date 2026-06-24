import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";

import { consumeEmailOtp, requestEmailOtp as requestEmailOtpWithStore, type EmailOtpRecord } from "./email-otp-service";
import { authorizeEmailOtpSignIn } from "./email-otp-sign-in";
import { resolveAuthRuntimeState } from "./runtime";
import { wechatProvider } from "./wechat-provider";

export const authRuntimeState = resolveAuthRuntimeState();

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
    return authorizeEmailOtpSignIn(credentials, {
      authAvailable: authRuntimeState.authAvailable,
      consumeOtp: (email, code, { now }) => consumeEmailOtp(email, code, {
        now,
        store: emailOtpStore,
      }),
      upsertUser: async (email) => prisma.user.upsert({
        where: { email },
        update: { email },
        create: { email },
      }),
    });
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
