import { describe, expect, test } from "vitest";

import { defaultSettings, settingsSchema } from "./schema";

describe("settingsSchema", () => {
  test("accepts the default countdown settings", () => {
    expect(settingsSchema.safeParse(defaultSettings).success).toBe(true);
  });

  test("rejects focus durations below one minute", () => {
    expect(
      settingsSchema.safeParse({
        focusMinutes: 0,
        breakMinutes: 5,
        rounds: 4,
        motionBackground: false,
      }).success,
    ).toBe(false);
  });

  test("rejects values above the configured upper bounds", () => {
    expect(
      settingsSchema.safeParse({
        focusMinutes: 181,
        breakMinutes: 61,
        rounds: 13,
        motionBackground: false,
      }).success,
    ).toBe(false);
  });

  test("rejects non-integer minute and round values", () => {
    expect(
      settingsSchema.safeParse({
        focusMinutes: 25.5,
        breakMinutes: 5,
        rounds: 4,
        motionBackground: false,
      }).success,
    ).toBe(false);
  });
});
