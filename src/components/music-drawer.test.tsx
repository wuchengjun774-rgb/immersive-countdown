import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { MusicDrawer } from "./music-drawer";

const openDrawerLabel = "打开音乐抽屉";
const searchLabel = "搜索音乐";
const submitLabel = "搜索";

beforeEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
});

test("opens the drawer and renders search results", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        tracks: [{ id: "coast-piano", title: "海岸钢琴", artist: "Built-in", source: "built-in", category: "轻钢琴" }],
      }),
      {
        headers: {
          "content-type": "application/json",
        },
      },
    ),
  );

  render(<MusicDrawer />);

  fireEvent.click(screen.getByRole("button", { name: openDrawerLabel }));
  fireEvent.change(screen.getByLabelText(searchLabel), { target: { value: "海岸" } });
  fireEvent.click(screen.getByRole("button", { name: submitLabel }));

  expect(await screen.findByText("海岸钢琴")).toBeTruthy();
  expect(screen.getByText("Built-in")).toBeTruthy();
  expect(screen.getByText("built-in")).toBeTruthy();
});

test("plays and pauses a selected built-in track", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.startsWith("/api/music/search")) {
      return new Response(
        JSON.stringify({
          tracks: [{ id: "coast-piano", title: "海岸钢琴", artist: "Built-in", source: "built-in", category: "轻钢琴" }],
        }),
        { headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        playback: {
          url: "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==",
          expiresAt: 123456789,
        },
      }),
      { headers: { "content-type": "application/json" } },
    );
  });

  render(<MusicDrawer />);

  fireEvent.click(screen.getByRole("button", { name: openDrawerLabel }));
  fireEvent.change(screen.getByLabelText(searchLabel), { target: { value: "海岸" } });
  fireEvent.click(screen.getByRole("button", { name: submitLabel }));

  expect(await screen.findByText("海岸钢琴")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "播放 海岸钢琴" }));

  expect(await screen.findByText("正在播放：海岸钢琴")).toBeTruthy();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "暂停 海岸钢琴" }));

  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
});

test("adjusts music volume", async () => {
  render(<MusicDrawer />);

  fireEvent.click(screen.getByRole("button", { name: openDrawerLabel }));

  const volume = screen.getByLabelText("音乐音量") as HTMLInputElement;
  fireEvent.change(volume, { target: { value: "35" } });

  expect(volume.value).toBe("35");
});

test("renders readable built-in music copy and controls", async () => {
  render(<MusicDrawer />);

  fireEvent.click(screen.getByRole("button", { name: openDrawerLabel }));

  expect(screen.getByText("当前提供内置舒缓曲目，音乐异常也不会影响计时。")).toBeTruthy();
  expect(screen.getByText("未选择音乐")).toBeTruthy();
  expect(screen.getByLabelText("音乐音量")).toBeTruthy();
});

test("shows a non-blocking fallback message when playback fails", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.startsWith("/api/music/search")) {
      return new Response(
        JSON.stringify({
          tracks: [{ id: "coast-piano", title: "海岸钢琴", artist: "Built-in", source: "built-in", category: "轻钢琴" }],
        }),
        { headers: { "content-type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ playback: null, error: "Music playback is temporarily unavailable" }), {
      headers: { "content-type": "application/json" },
    });
  });

  render(<MusicDrawer />);

  fireEvent.click(screen.getByRole("button", { name: openDrawerLabel }));
  fireEvent.change(screen.getByLabelText(searchLabel), { target: { value: "海岸" } });
  fireEvent.click(screen.getByRole("button", { name: submitLabel }));

  expect(await screen.findByText("海岸钢琴")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "播放 海岸钢琴" }));

  expect(await screen.findByText("Music playback is temporarily unavailable")).toBeTruthy();
  expect(screen.getByRole("button", { name: submitLabel })).toBeTruthy();
});

test("shows a non-blocking fallback message when music search fails", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ tracks: [], error: "Music search is temporarily unavailable" }), {
      headers: {
        "content-type": "application/json",
      },
    }),
  );

  render(<MusicDrawer />);

  fireEvent.click(screen.getByRole("button", { name: openDrawerLabel }));
  fireEvent.change(screen.getByLabelText(searchLabel), { target: { value: "海岸" } });
  fireEvent.click(screen.getByRole("button", { name: submitLabel }));

  expect(await screen.findByText("Music search is temporarily unavailable")).toBeTruthy();
  await waitFor(() => {
    expect(screen.getByRole("button", { name: submitLabel })).toBeTruthy();
  });
});
