export const defaultFocusConfig = {
  focusMs: 25 * 60_000,
  breakMs: 5 * 60_000,
  rounds: 4,
} as const;

export type FocusSession = {
  phase: "focus" | "break";
  round: number;
  rounds: number;
  done?: boolean;
};

export function advanceFocusPhase(session: FocusSession): FocusSession {
  if (session.phase === "focus") {
    return { ...session, phase: "break", done: false };
  }

  const nextRound = session.round + 1;
  return {
    ...session,
    phase: "focus",
    round: nextRound,
    done: nextRound > session.rounds,
  };
}
