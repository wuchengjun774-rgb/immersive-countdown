export type SessionRow = {
  mode: "focus" | "leisure";
  durationMs: number;
  interrupted: boolean;
  endedAt: Date;
};

export type DailySessionSummary = {
  completedMs: number;
  completedRounds: number;
  interruptions: number;
  zone: string;
};

export type DatedDailySessionSummary = DailySessionSummary & {
  date: string;
};

function createEmptySummary(zone: string): DailySessionSummary {
  return {
    completedMs: 0,
    completedRounds: 0,
    interruptions: 0,
    zone,
  };
}

function addFocusRow(summary: DailySessionSummary, row: SessionRow): DailySessionSummary {
  if (row.mode !== "focus") {
    return summary;
  }

  if (row.interrupted) {
    return {
      ...summary,
      interruptions: summary.interruptions + 1,
    };
  }

  return {
    ...summary,
    completedMs: summary.completedMs + row.durationMs,
    completedRounds: summary.completedRounds + 1,
  };
}

export function aggregateDailySessions(rows: SessionRow[], zone: string) {
  return rows.reduce(
    (summary, row) => addFocusRow(summary, row),
    createEmptySummary(zone),
  );
}

function formatLocalDate(date: Date, zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildRecentDailyFocusStats(
  rows: SessionRow[],
  zone: string,
  now = new Date(),
): DatedDailySessionSummary[] {
  const latestDay = formatLocalDate(now, zone);
  const earliestDay = shiftIsoDate(latestDay, -6);
  const summaries = new Map<string, DailySessionSummary>();

  for (const row of rows) {
    const day = formatLocalDate(row.endedAt, zone);

    if (day < earliestDay || day > latestDay) {
      continue;
    }

    const existing = summaries.get(day) ?? createEmptySummary(zone);
    summaries.set(day, addFocusRow(existing, row));
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftIsoDate(earliestDay, index);

    return {
      date,
      ...(summaries.get(date) ?? createEmptySummary(zone)),
    };
  });
}
