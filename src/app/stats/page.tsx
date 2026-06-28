import { AppShell } from "@/components/app-shell";
import { auth } from "@/auth/config";
import { prisma } from "@/lib/db";
import { findUserIdByEmail } from "@/lib/session-repository";
import {
  aggregateDailySessions,
  buildRecentDailyFocusStats,
  type DatedDailySessionSummary,
  type SessionRow,
} from "@/features/stats/aggregate";

type StatsViewModel = {
  recentDays: DatedDailySessionSummary[];
  signedIn: boolean;
  streakDays: number;
  today: {
    completedMs: number;
    completedRounds: number;
  };
};

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

function formatDuration(durationMs: number) {
  const totalMinutes = Math.round(durationMs / 60_000);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatShortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatLocalDate(date: Date, zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function computeStreakDays(recentDays: DatedDailySessionSummary[]) {
  let streakDays = 0;

  for (let index = recentDays.length - 1; index >= 0; index -= 1) {
    if (recentDays[index]?.completedRounds > 0) {
      streakDays += 1;
      continue;
    }

    break;
  }

  return streakDays;
}

async function loadStatsViewModel(now = new Date()): Promise<StatsViewModel> {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const emptyRecentDays = buildRecentDailyFocusStats([], zone, now);

  try {
    const userId = await resolveAuthenticatedUserId();

    if (!userId) {
      return {
        recentDays: emptyRecentDays,
        signedIn: false,
        streakDays: 0,
        today: {
          completedMs: 0,
          completedRounds: 0,
        },
      };
    }

    const rows = await prisma.timerSession.findMany({
      where: {
        userId,
      },
      orderBy: {
        endedAt: "asc",
      },
      select: {
        mode: true,
        durationMs: true,
        interrupted: true,
        endedAt: true,
      },
    }) as SessionRow[];

    const recentDays = buildRecentDailyFocusStats(rows, zone, now);
    const todayDate = recentDays[recentDays.length - 1]?.date;
    const today = aggregateDailySessions(
      rows.filter((row) => formatLocalDate(row.endedAt, zone) === todayDate),
      zone,
    );

    return {
      recentDays,
      signedIn: true,
      streakDays: computeStreakDays(recentDays),
      today: {
        completedMs: today.completedMs,
        completedRounds: today.completedRounds,
      },
    };
  } catch {
    return {
      recentDays: emptyRecentDays,
      signedIn: false,
      streakDays: 0,
      today: {
        completedMs: 0,
        completedRounds: 0,
      },
    };
  }
}

function StatCard({
  label,
  value,
  detail,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5 shadow-xl shadow-slate-950/20">
      <p className="text-xs font-semibold tracking-[0.3em] text-cyan-100/75 uppercase">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/65">{detail}</p>
    </article>
  );
}

export default async function Page() {
  const stats = await loadStatsViewModel();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const maxCompletedMs = Math.max(...stats.recentDays.map((day) => day.completedMs), 1);

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-[2rem] border border-white/15 bg-slate-950/35 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8">
        <div className="space-y-3 text-white">
          <p className="text-xs font-semibold tracking-[0.35em] text-cyan-100/80 uppercase">Focus report</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Focus insights</h2>
          <p className="max-w-3xl text-sm leading-7 text-white/75">
            {stats.signedIn
              ? "Your recent focus sessions are grouped into a calm weekly snapshot."
              : "Sign in to see synced focus history."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            detail="Completed focus time logged for the current local day."
            label="Today focus"
            value={formatDuration(stats.today.completedMs)}
          />
          <StatCard
            detail="Finished focus rounds today."
            label="Completed rounds"
            value={String(stats.today.completedRounds)}
          />
          <StatCard
            detail="Consecutive recent days with at least one completed focus round."
            label="Streak days"
            value={`${stats.streakDays} ${stats.streakDays === 1 ? "day" : "days"}`}
          />
        </div>

        <section
          aria-labelledby="recent-seven-days-heading"
          className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3
                className="text-xl font-medium text-white"
                id="recent-seven-days-heading"
              >
                Recent seven days
              </h3>
              <p className="mt-1 text-sm text-white/65">Each bar reflects completed focus time for that day.</p>
            </div>
            <p className="text-xs tracking-[0.25em] text-white/45 uppercase">{zone}</p>
          </div>

          <ol className="mt-5 space-y-3">
            {stats.recentDays.map((day) => {
              const width = `${Math.max((day.completedMs / maxCompletedMs) * 100, day.completedMs > 0 ? 12 : 4)}%`;

              return (
                <li
                  className="grid gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[5.5rem_minmax(0,1fr)_4rem_5rem]"
                  key={day.date}
                >
                  <span className="text-sm font-medium text-white">{formatShortDate(day.date)}</span>
                  <div aria-hidden="true" className="flex items-center">
                    <div className="h-2.5 w-full rounded-full bg-white/10">
                      <div className="h-2.5 rounded-full bg-cyan-200/85" style={{ width }} />
                    </div>
                  </div>
                  <span className="text-sm text-white/70">{formatDuration(day.completedMs)}</span>
                  <span className="text-sm text-white/55">{day.completedRounds} rounds</span>
                </li>
              );
            })}
          </ol>
        </section>
      </section>
    </AppShell>
  );
}
