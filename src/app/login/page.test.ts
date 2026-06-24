import { describe, expect, test } from "vitest";

import { getLoginMessage } from "./messages";

describe("getLoginMessage", () => {
  test("shows a not-configured fallback instead of implying code delivery", () => {
    expect(
      getLoginMessage({
        status: "not-configured",
      }),
    ).toContain("isn't configured");
  });

  test("separates invalid codes from expired codes and cancelled oauth flows", () => {
    expect(
      getLoginMessage({
        error: "CredentialsSignin",
      }),
    ).toContain("invalid");

    expect(
      getLoginMessage({
        status: "expired",
      }),
    ).toContain("expired");

    expect(
      getLoginMessage({
        error: "AccessDenied",
      }),
    ).toContain("cancelled");
  });
});
