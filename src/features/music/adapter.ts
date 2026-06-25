import type { Track } from "./types";

export interface MusicAdapter {
  capabilities(): { search: boolean; playback: boolean };
  search(query: string): Promise<Track[]>;
  resolvePlayback(trackId: string): Promise<{ url: string; expiresAt: number } | null>;
}
