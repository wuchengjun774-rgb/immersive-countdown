import { redirect } from "next/navigation";

import { DELETE as deleteAccount } from "@/app/api/account/route";
import { auth, signOut } from "@/auth/config";
import { AppShell } from "@/components/app-shell";
import { defaultSettings } from "@/features/settings/schema";

async function deleteAccountAction() {
  "use server";

  const response = await deleteAccount();

  if (response.status === 200) {
    redirect("/login?status=account-deleted");
  }

  redirect("/settings?status=delete-requires-auth");
}

async function signOutAction() {
  "use server";

  await signOut({ redirectTo: "/login" });
}

function Field({
  children,
  description,
  fieldId,
  label,
}: {
  children: React.ReactNode;
  description: string;
  fieldId: string;
  label: string;
}) {
  return (
    <div className="space-y-2 text-sm text-white/80">
      <label className="block font-medium text-white" htmlFor={fieldId}>{label}</label>
      {children}
      <span className="block text-xs leading-6 text-white/50">{description}</span>
    </div>
  );
}

export default async function Page() {
  const session = await auth().catch(() => null);
  const signedIn = Boolean(session?.user);

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-[2rem] border border-white/15 bg-slate-950/35 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8">
        <div className="space-y-3 text-white">
          <p className="text-xs font-semibold tracking-[0.35em] text-cyan-100/80 uppercase">Personal controls</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h2>
          <p className="max-w-3xl text-sm leading-7 text-white/75">
            Preference sync still requires authenticated persistence support.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
            <Field
              description="Preview your preferred rhythm without implying account sync."
              fieldId="countdown-mode"
              label="Countdown mode"
            >
              <select
                className="w-full rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-base text-white outline-none focus:border-cyan-200/60"
                defaultValue="deep-focus"
                id="countdown-mode"
                name="countdown-mode"
              >
                <option value="deep-focus">Deep focus sprint</option>
                <option value="balanced">Balanced tide cycle</option>
                <option value="gentle">Gentle recovery loop</option>
              </select>
            </Field>

            <Field
              description={`Dynamic ocean motion currently defaults to ${defaultSettings.motionBackground ? "on" : "off"}.`}
              fieldId="scene-background"
              label="Scene background"
            >
              <select
                className="w-full rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-base text-white outline-none focus:border-cyan-200/60"
                defaultValue={defaultSettings.motionBackground ? "motion" : "still"}
                id="scene-background"
                name="scene-background"
              >
                <option value="still">Still horizon</option>
                <option value="motion">Motion-rich ocean</option>
                <option value="dusk">Dusk ambient gradient</option>
              </select>
            </Field>

            <Field
              description="Choose how assertive completion nudges should feel."
              fieldId="reminder-style"
              label="Reminder style"
            >
              <select
                className="w-full rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-base text-white outline-none focus:border-cyan-200/60"
                defaultValue="soft"
                id="reminder-style"
                name="reminder-style"
              >
                <option value="soft">Soft chime</option>
                <option value="spoken">Spoken cue</option>
                <option value="silent">Silent visual pulse</option>
              </select>
            </Field>

            <Field
              description="Music choices stay local to this surface until playback preferences are synced."
              fieldId="music-atmosphere"
              label="Music atmosphere"
            >
              <select
                className="w-full rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-base text-white outline-none focus:border-cyan-200/60"
                defaultValue="shoreline"
                id="music-atmosphere"
                name="music-atmosphere"
              >
                <option value="shoreline">Shoreline piano</option>
                <option value="rain">Rain and strings</option>
                <option value="none">No background music</option>
              </select>
            </Field>
          </section>

          <section className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/15 p-5 text-white">
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Account actions</h3>
              <p className="text-sm leading-7 text-white/70">
                {signedIn
                  ? "You can leave the session or permanently remove the synced account data from here."
                  : "You can still open these actions now; authenticated identity is required before any synced account data changes happen."}
              </p>
            </div>

            <div className="grid gap-3">
              <form action={signOutAction}>
                <button
                  className="w-full rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  type="submit"
                >
                  Sign out
                </button>
              </form>

              <form action={deleteAccountAction}>
                <button
                  className="w-full rounded-full border border-rose-300/25 bg-rose-950/35 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-900/45"
                  type="submit"
                >
                  Delete personal data
                </button>
              </form>
            </div>

            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">
              <p>Current timer defaults: {defaultSettings.focusMinutes} minute focus, {defaultSettings.breakMinutes} minute break, {defaultSettings.rounds} rounds.</p>
              <p className="mt-2">Sync for these richer settings is intentionally not implied until the backing API supports them.</p>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
