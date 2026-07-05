import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockResolvePlayback } = vi.hoisted(() => ({
  mockResolvePlayback: vi.fn(),
}));

vi.mock("@/features/music/mock-adapter", () => ({
  mockMusicAdapter: {
    capabilities: () => ({ search: true, playback: true }),
    search: vi.fn(),
    resolvePlayback: mockResolvePlayback,
  },
}));

import { GET } from "./route";

describe("/api/music/playback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns playback metadata for a known track", async () => {
    mockResolvePlayback.mockResolvedValue({
      url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA",
      expiresAt: 123456789,
    });

    const response = await GET(new Request("http://localhost/api/music/playback?id=coast-piano"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      playback: {
        url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA",
        expiresAt: 123456789,
      },
    });
    expect(mockResolvePlayback).toHaveBeenCalledWith("coast-piano");
  });

  test("returns null playback for missing ids", async () => {
    const response = await GET(new Request("http://localhost/api/music/playback"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      playback: null,
      error: "Track id is required",
    });
    expect(mockResolvePlayback).not.toHaveBeenCalled();
  });

  test("returns null playback for unknown tracks", async () => {
    mockResolvePlayback.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/music/playback?id=unknown"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      playback: null,
      error: "Track playback is unavailable",
    });
  });

  test("degrades safely when playback resolution fails", async () => {
    mockResolvePlayback.mockRejectedValue(new Error("adapter unavailable"));

    const response = await GET(new Request("http://localhost/api/music/playback?id=coast-piano"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      playback: null,
      error: "Music playback is temporarily unavailable",
    });
  });
});
