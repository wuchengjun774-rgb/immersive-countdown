import { z } from "zod";

export const settingsSchema = z.object({
  focusMinutes: z.number().int().min(1).max(180),
  breakMinutes: z.number().int().min(1).max(60),
  rounds: z.number().int().min(1).max(12),
  motionBackground: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = {
  focusMinutes: 25,
  breakMinutes: 5,
  rounds: 4,
  motionBackground: false,
};
