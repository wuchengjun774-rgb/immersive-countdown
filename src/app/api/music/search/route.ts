import { NextResponse } from "next/server";

import { mockMusicAdapter } from "@/features/music/mock-adapter";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const tracks = await mockMusicAdapter.search(query);

    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({
      tracks: [],
      error: "Music search is temporarily unavailable",
    });
  }
}
