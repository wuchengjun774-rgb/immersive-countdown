import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { requestEmailOtp, signIn } from "@/auth/config";
import { AppShell } from "@/components/app-shell";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

function getMessage(status: string | undefined, retryAfterMs: string | undefined) {
  if (status === "code-sent") {
    return "If delivery is configured, a one-time code is on its way to your inbox.";
  }

  if (status === "rate-limited") {
    const retryInSeconds = retryAfterMs ? Math.ceil(Number(retryAfterMs) / 1_000) : 60;

    return `Please wait about ${retryInSeconds} seconds before requesting another code.`;
  }

  return "Choose email OTP or WeChat sign-in to sync your focus settings across devices.";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const status = readParam(resolvedSearchParams.status);
  const error = readParam(resolvedSearchParams.error);
  const email = readParam(resolvedSearchParams.email) ?? "";
  const retryAfterMs = readParam(resolvedSearchParams.retryAfterMs);
  const message = getMessage(status, retryAfterMs);

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-[2rem] border border-white/15 bg-slate-950/35 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8">
        <div className="space-y-3 text-white">
          <p className="text-xs font-semibold tracking-[0.35em] text-cyan-100/80 uppercase">Account sync</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sign in to save your countdown world</h2>
          <p className="max-w-2xl text-sm leading-7 text-white/75">{message}</p>
          {error ? (
            <p className="rounded-2xl border border-rose-300/25 bg-rose-950/35 px-4 py-3 text-sm text-rose-100/90">
              Sign-in failed with: {error}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-white">Email one-time passcode</h3>
              <p className="text-sm text-white/65">
                Request a 6-digit code, then enter it below within the 10-minute validity window.
              </p>
            </div>

            <form
              action={async (formData) => {
                "use server";

                const requestResult = await requestEmailOtp(formData.get("email"));
                const nextSearchParams = new URLSearchParams();

                if (requestResult.normalizedEmail) {
                  nextSearchParams.set("email", requestResult.normalizedEmail);
                }

                nextSearchParams.set("status", requestResult.ok ? "code-sent" : "rate-limited");

                if (requestResult.retryAfterMs) {
                  nextSearchParams.set("retryAfterMs", String(requestResult.retryAfterMs));
                }

                redirect(`/login?${nextSearchParams.toString()}`);
              }}
              className="flex flex-col gap-3"
            >
              <label className="space-y-2 text-sm text-white/80">
                <span>Email address</span>
                <input
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-cyan-200/60"
                  defaultValue={email}
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </label>
              <button
                className="rounded-full bg-cyan-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                type="submit"
              >
                Send verification code
              </button>
            </form>

            <form
              action={async (formData) => {
                "use server";

                try {
                  await signIn("email-otp", formData);
                } catch (error) {
                  if (error instanceof AuthError) {
                    redirect(`/login?error=${encodeURIComponent(error.type)}`);
                  }

                  throw error;
                }
              }}
              className="grid gap-3 sm:grid-cols-[1fr_auto]"
            >
              <input name="email" type="hidden" value={email} />
              <label className="space-y-2 text-sm text-white/80 sm:col-span-2">
                <span>One-time code</span>
                <input
                  autoComplete="one-time-code"
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-base tracking-[0.4em] text-white outline-none placeholder:text-white/35 focus:border-cyan-200/60"
                  inputMode="numeric"
                  maxLength={6}
                  name="code"
                  placeholder="123456"
                  required
                  type="text"
                />
              </label>
              <button
                className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 sm:col-span-2"
                type="submit"
              >
                Sign in with email code
              </button>
            </form>
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-white">WeChat QR login</h3>
              <p className="text-sm text-white/65">
                Use an approved WeChat Open Platform site app when client credentials are configured.
              </p>
            </div>

            <form
              action={async () => {
                "use server";

                try {
                  await signIn("wechat", { redirectTo: "/" });
                } catch (error) {
                  if (error instanceof AuthError) {
                    redirect(`/login?error=${encodeURIComponent(error.type)}`);
                  }

                  throw error;
                }
              }}
            >
              <button
                className="flex w-full items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/90 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                type="submit"
              >
                Continue with WeChat
              </button>
            </form>

            <ul className="space-y-2 text-sm leading-6 text-white/65">
              <li>• Missing production WeChat secrets fall back to inert placeholders so builds stay safe.</li>
              <li>• No secrets are committed, rendered, or echoed on this page.</li>
              <li>• Settings sync continues to require authenticated identity before persistence.</li>
            </ul>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
