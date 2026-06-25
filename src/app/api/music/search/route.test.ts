import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockSearch } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
}));

vi.mock("@/features/music/mock-adapter", () => ({
  mockMusicAdapter: {
    capabilities: () => ({ search: true, playback: true }),
    search: mockSearch,
    resolvePlayback: vi.fn(),
  },
}));

import { GET } from "./route";

describe("/api/music/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns matching tracks for a query", async () => {
    mockSearch.mockResolvedValue([
      { id: "coast-piano", title: "海岸钢琴", artist: "Demo", source: "mock" },
    ]);

    const response = await GET(new Request("http://localhost/api/music/search?q=海岸"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tracks: [{ id: "coast-piano", title: "海岸钢琴", artist: "Demo", source: "mock" }],
    });
    expect(mockSearch).toHaveBeenCalledWith("海岸");
  });

  test("returns an empty list for blank queries", async () => {
    const response = await GET(new Request("http://localhost/api/music/search?q=   "));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tracks: [] });
    expect(mockSearch).not.toHaveBeenCalled();
  });

  test("degrades safely when the music platform fails", async () => {
    mockSearch.mockRejectedValue(new Error("platform unavailable"));

    const response = await GET(new Request("http://localhost/api/music/search?q=海岸"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tracks: [],
      error: "Music search is temporarily unavailable",
    });
  });
});
