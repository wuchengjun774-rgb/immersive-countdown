import { auth } from "@/auth/config";
import { prisma } from "@/lib/db";
import { findUserIdByEmail } from "@/lib/session-repository";

export type DeleteAuthenticatedAccountResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "unavailable" };

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

export async function deleteAuthenticatedAccount(): Promise<DeleteAuthenticatedAccountResult> {
  try {
    const userId = await resolveAuthenticatedUserId();

    if (!userId) {
      return { ok: false, reason: "unauthenticated" };
    }

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return { ok: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
