import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { MusicDrawer } from "./music-drawer";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

test("opens the drawer and renders search results", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        tracks: [{ id: "coast-piano", title: "海岸钢琴", artist: "Demo", source: "mock" }],
      }),
      {
        headers: {
          "content-type": "application/json",
        },
      },
    ),
  );

  render(<MusicDrawer />);

  fireEvent.click(screen.getByRole("button", { name: "打开音乐抽屉" }));
  fireEvent.change(screen.getByLabelText("搜索音乐"), { target: { value: "海岸" } });
  fireEvent.click(screen.getByRole("button", { name: "搜索" }));

  expect(await screen.findByText("海岸钢琴")).toBeTruthy();
  expect(screen.getByText("Demo")).toBeTruthy();
  expect(screen.getByText("mock")).toBeTruthy();
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

  fireEvent.click(screen.getByRole("button", { name: "打开音乐抽屉" }));
  fireEvent.change(screen.getByLabelText("搜索音乐"), { target: { value: "海岸" } });
  fireEvent.click(screen.getByRole("button", { name: "搜索" }));

  expect(await screen.findByText("Music search is temporarily unavailable")).toBeTruthy();
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "搜索" })).toBeTruthy();
  });
});
