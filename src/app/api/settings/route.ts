import { NextResponse } from "next/server";

import { auth } from "@/auth/config";
import { defaultSettings, settingsSchema } from "@/features/settings/schema";
import { prisma } from "@/lib/db";
import { findUserIdByEmail } from "@/lib/session-repository";

async function resolveAuthenticatedUserId() {
  const session = await auth();
  const user = session?.user;

  if (user && "id" in user && typeof user.id === "string" && user.id.length > 0) {
    return user.id;
  }

  if (user?.email) {
    return findUserIdByEmail(user.email);
  }

  return null;
}

function toSettings(record: {
  breakMinutes: number;
  focusMinutes: number;
  motionBackground: boolean;
  rounds: number;
}) {
  return {
    breakMinutes: record.breakMinutes,
    focusMinutes: record.focusMinutes,
    motionBackground: record.motionBackground,
    rounds: record.rounds,
  };
}

export async function GET() {
  const userId = await resolveAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({
      settings: defaultSettings,
      persisted: false,
      requiresUserIdentity: true,
    });
  }

  const persistedSettings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  return NextResponse.json({
    settings: persistedSettings ? toSettings(persistedSettings) : defaultSettings,
    persisted: Boolean(persistedSettings),
    requiresUserIdentity: false,
  });
}

export async function PUT(request: Request) {
  const userId = await resolveAuthenticatedUserId();
  const body = await request.json().catch(() => null);
  const result = settingsSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid settings payload",
        issues: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (!userId) {
    return NextResponse.json({
      error: "Authentication is required to persist settings",
      requiresUserIdentity: true,
    }, { status: 401 });
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: result.data,
    create: {
      userId,
      ...result.data,
    },
  });

  return NextResponse.json({
    settings: toSettings(settings),
    persisted: true,
    requiresUserIdentity: false,
  });
}
