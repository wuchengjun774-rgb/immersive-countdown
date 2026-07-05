import { NextResponse } from "next/server";

import { mockMusicAdapter } from "@/features/music/mock-adapter";

export async function GET(request: Request) {
  const trackId = new URL(request.url).searchParams.get("id")?.trim() ?? "";

  if (!trackId) {
    return NextResponse.json(
      {
        playback: null,
        error: "Track id is required",
      },
      { status: 400 },
    );
  }

  try {
    const playback = await mockMusicAdapter.resolvePlayback(trackId);

    if (!playback) {
      return NextResponse.json(
        {
          playback: null,
          error: "Track playback is unavailable",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ playback });
  } catch {
    return NextResponse.json({
      playback: null,
      error: "Music playback is temporarily unavailable",
    });
  }
}
