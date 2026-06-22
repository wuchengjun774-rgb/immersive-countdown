import { AppShell } from "../components/app-shell";
import { TimerFace } from "../features/timer/timer-face";

export default function Page() {
  return (
    <AppShell>
      <TimerFace />
    </AppShell>
  );
}
