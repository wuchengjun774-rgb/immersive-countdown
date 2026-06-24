import { NextResponse } from "next/server";

import { defaultSettings, settingsSchema } from "@/features/settings/schema";
import { prisma } from "@/lib/db";

const settingsSelect = {
  focusMinutes: true,
  breakMinutes: true,
  rounds: true,
  motionBackground: true,
} as const;

function getUserId(request: Request) {
  return request.headers.get("x-user-id");
}

export async function GET(request: Request) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json({
      settings: defaultSettings,
      persisted: false,
      requiresUserIdentity: true,
    });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: settingsSelect,
  });

  return NextResponse.json({
    settings: settings ?? defaultSettings,
    persisted: settings !== null,
    requiresUserIdentity: false,
  });
}

export async function PUT(request: Request) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json(
      {
        error: "User identity is required to persist settings",
        requiresUserIdentity: true,
      },
      { status: 401 },
    );
  }

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

  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      settings: {
        create: result.data,
      },
    },
    update: {
      settings: {
        upsert: {
          create: result.data,
          update: result.data,
        },
      },
    },
    select: {
      settings: {
        select: settingsSelect,
      },
    },
  });

  return NextResponse.json({
    settings: user.settings ?? result.data,
    persisted: true,
    requiresUserIdentity: false,
  });
}
