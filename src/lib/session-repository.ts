import { prisma } from "@/lib/db";

import type { PendingSession } from "@/features/timer/sync-queue";

export async function findUserIdByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function saveTimerSession(input: PendingSession & { userId: string }) {
  await prisma.timerSession.upsert({
    where: { syncKey: input.syncKey },
    create: {
      userId: input.userId,
      mode: input.mode,
      startedAt: new Date(input.startedAt),
      endedAt: new Date(input.endedAt),
      durationMs: input.durationMs,
      interrupted: input.interrupted,
      syncKey: input.syncKey,
    },
    update: {},
  });
}
