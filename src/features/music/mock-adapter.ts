import type { MusicAdapter } from "./adapter";
import { demoTracks } from "./types";

export const mockMusicAdapter: MusicAdapter = {
  capabilities: () => ({ search: true, playback: true }),
  search: async (query) => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    return demoTracks.filter((track) => track.title.includes(normalizedQuery));
  },
  resolvePlayback: async (trackId) => {
    const track = demoTracks.find((candidate) => candidate.id === trackId);

    if (!track) {
      return null;
    }

    return {
      url: `/demo-music/${trackId}.mp3`,
      expiresAt: Date.now() + 3_600_000,
    };
  },
};
