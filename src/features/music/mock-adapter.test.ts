import { describe, expect, test } from "vitest";

import { mockMusicAdapter } from "./mock-adapter";

describe("mockMusicAdapter", () => {
  test("returns licensed demo tracks", async () => {
    expect((await mockMusicAdapter.search("海岸"))[0]).toMatchObject({
      title: "海岸钢琴",
      source: "built-in",
    });
  });

  test("returns built-in calming tracks by category", async () => {
    const tracks = await mockMusicAdapter.search("雨");

    expect(tracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "soft-rain",
          title: "轻柔雨声",
          source: "built-in",
        }),
      ]),
    );
  });

  test("reports search and playback capabilities", () => {
    expect(mockMusicAdapter.capabilities()).toEqual({
      search: true,
      playback: true,
    });
  });

  test("resolves built-in playback URLs with expiry metadata", async () => {
    const playback = await mockMusicAdapter.resolvePlayback("coast-piano");

    expect(playback).toMatchObject({
      url: expect.stringMatching(/^data:audio\/wav;base64,/),
    });
    expect(typeof playback?.expiresAt).toBe("number");
  });

  test("returns null playback for unknown tracks", async () => {
    await expect(mockMusicAdapter.resolvePlayback("unknown")).resolves.toBeNull();
  });
});
