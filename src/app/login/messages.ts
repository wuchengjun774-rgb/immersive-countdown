type LoginMessageInput = {
  error?: string;
  retryAfterMs?: string;
  status?: string;
};

export function getLoginMessage({ error, retryAfterMs, status }: LoginMessageInput) {
  if (status === "code-sent") {
    return "Your one-time code is on its way. Enter it within 10 minutes to finish signing in.";
  }

  if (status === "not-configured") {
    return "Email code delivery isn't configured right now. Use WeChat sign-in if it's available, or try again later.";
  }

  if (status === "delivery-failed") {
    return "We couldn't deliver a code just now. Please try again in a moment or use another sign-in option.";
  }

  if (status === "rate-limited") {
    const retryInSeconds = retryAfterMs ? Math.ceil(Number(retryAfterMs) / 1_000) : 60;

    return `Please wait about ${retryInSeconds} seconds before requesting another code.`;
  }

  if (status === "expired") {
    return "That email code has expired. Request a new one to keep going.";
  }

  if (status === "auth-unavailable" || error === "Configuration") {
    return "Sign-in is temporarily unavailable because authentication isn't configured for this deployment.";
  }

  if (error === "CredentialsSignin") {
    return "That code looks invalid. Double-check it or request a fresh one if it may have expired.";
  }

  if (error === "AccessDenied") {
    return "WeChat sign-in was cancelled or denied. You can try again or use an email code instead.";
  }

  return "Choose email OTP or WeChat sign-in to sync your focus settings across devices.";
}
