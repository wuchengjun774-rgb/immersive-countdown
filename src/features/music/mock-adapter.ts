import type { MusicAdapter } from "./adapter";
import { demoTracks } from "./types";

const trackFrequencies: Record<string, number> = {
  "coast-piano": 261.63,
  "ocean-breath": 196,
  "soft-rain": 329.63,
  "forest-air": 220,
  "deep-calm": 174.61,
};

const playbackCache = new Map<string, string>();

function createWavDataUrl(frequency: number) {
  const sampleRate = 8_000;
  const durationSeconds = 2;
  const sampleCount = sampleRate * durationSeconds;
  const headerSize = 44;
  const bytesPerSample = 2;
  const buffer = Buffer.alloc(headerSize + sampleCount * bytesPerSample);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + sampleCount * bytesPerSample, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(sampleCount * bytesPerSample, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.sin((Math.PI * index) / sampleCount);
    const base = Math.sin((2 * Math.PI * frequency * index) / sampleRate);
    const harmony = Math.sin((2 * Math.PI * frequency * 1.5 * index) / sampleRate) * 0.35;
    const sample = Math.round((base + harmony) * envelope * 4_000);

    buffer.writeInt16LE(sample, headerSize + index * bytesPerSample);
  }

  return `data:audio/wav;base64,${buffer.toString("base64")}`;
}

function resolveBuiltInAudioUrl(trackId: string) {
  const cached = playbackCache.get(trackId);

  if (cached) {
    return cached;
  }

  const frequency = trackFrequencies[trackId] ?? 220;
  const url = createWavDataUrl(frequency);

  playbackCache.set(trackId, url);
  return url;
}

export const mockMusicAdapter: MusicAdapter = {
  capabilities: () => ({ search: true, playback: true }),
  search: async (query) => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    return demoTracks.filter((track) =>
      [track.title, track.artist, track.source, track.category].some((value) => value.includes(normalizedQuery)),
    );
  },
  resolvePlayback: async (trackId) => {
    const track = demoTracks.find((candidate) => candidate.id === trackId);

    if (!track) {
      return null;
    }

    return {
      url: resolveBuiltInAudioUrl(trackId),
      expiresAt: Date.now() + 3_600_000,
    };
  },
};
