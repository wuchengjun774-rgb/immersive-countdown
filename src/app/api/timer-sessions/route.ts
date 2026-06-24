import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth/config";
import { findUserIdByEmail, saveTimerSession } from "@/lib/session-repository";

const pendingSessionSchema = z.object({
  syncKey: z.string().trim().min(1),
  mode: z.enum(["focus", "leisure"]),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  interrupted: z.boolean(),
});

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

export async function POST(request: Request) {
  const userId = await resolveAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({
      error: "Authentication is required to persist timer sessions",
      requiresUserIdentity: true,
    }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = pendingSessionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({
      error: "Invalid timer session payload",
      issues: result.error.flatten(),
    }, { status: 400 });
  }

  await saveTimerSession({
    userId,
    ...result.data,
  });

  return NextResponse.json({ acknowledged: true });
}
