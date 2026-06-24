import { NextResponse } from "next/server";

import { defaultSettings, settingsSchema } from "@/features/settings/schema";

export async function GET() {
  return NextResponse.json({
    settings: defaultSettings,
    persisted: false,
    requiresUserIdentity: true,
  });
}

export async function PUT(request: Request) {
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

  return NextResponse.json({
    error: "Authentication is required to persist settings",
    requiresUserIdentity: true,
  }, { status: 401 });
}
