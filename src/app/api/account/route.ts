import { NextResponse } from "next/server";

import { auth } from "@/auth/config";
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

export async function DELETE() {
  const userId = await resolveAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({
      error: "Authentication is required to delete this account",
      requiresUserIdentity: true,
    }, { status: 401 });
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return NextResponse.json({ deleted: true });
}
