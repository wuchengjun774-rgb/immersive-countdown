import { describe, expect, test } from "vitest";

import { mockMusicAdapter } from "./mock-adapter";

describe("mockMusicAdapter", () => {
  test("returns licensed demo tracks", async () => {
    expect((await mockMusicAdapter.search("海岸"))[0]).toMatchObject({
      title: "海岸钢琴",
      source: "mock",
    });
  });

  test("reports search and playback capabilities", () => {
    expect(mockMusicAdapter.capabilities()).toEqual({
      search: true,
      playback: true,
    });
  });

  test("resolves demo playback URLs with expiry metadata", async () => {
    const playback = await mockMusicAdapter.resolvePlayback("coast-piano");

    expect(playback).toMatchObject({
      url: "/demo-music/coast-piano.mp3",
    });
    expect(typeof playback?.expiresAt).toBe("number");
  });
});
