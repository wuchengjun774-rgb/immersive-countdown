"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import type { Track } from "@/features/music/types";

type SearchState = {
  tracks: Track[];
  error: string | null;
};

type PlaybackState = {
  currentTrack: Track | null;
  error: string | null;
  playing: boolean;
  url: string | null;
};

const drawerButtonLabel = "\u6253\u5f00\u97f3\u4e50\u62bd\u5c49";
const drawerTitle = "\u97f3\u4e50";
const drawerDescription =
  "\u5f53\u524d\u4ec5\u63d0\u4f9b mock \u6f14\u793a\u66f2\u76ee\uff0c\u5e73\u53f0\u5f02\u5e38\u4e5f\u4e0d\u4f1a\u5f71\u54cd\u8ba1\u65f6\u3002";
const closeButtonLabel = "\u5173\u95ed";
const searchLabel = "\u641c\u7d22\u97f3\u4e50";
const searchPlaceholder = "\u641c\u7d22\u6f14\u793a\u66f2\u76ee";
const submitLabel = "\u641c\u7d22";
const loadingLabel = "\u641c\u7d22\u4e2d\u2026";
const fallbackError = "Music search is temporarily unavailable";
const playbackFallbackError = "Music playback is temporarily unavailable";

export function MusicDrawer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(50);
  const [results, setResults] = useState<SearchState>({ tracks: [], error: null });
  const [playback, setPlayback] = useState<PlaybackState>({
    currentTrack: null,
    error: null,
    playing: false,
    url: null,
  });

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setResults({ tracks: [], error: null });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(normalizedQuery)}`);
      const payload = (await response.json()) as { tracks?: Track[]; error?: string };

      setResults({
        tracks: payload.tracks ?? [],
        error: payload.error ?? null,
      });
    } catch {
      setResults({
        tracks: [],
        error: fallbackError,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePlay(track: Track) {
    if (playback.currentTrack?.id === track.id && playback.playing) {
      audioRef.current?.pause();
      setPlayback((current) => ({ ...current, playing: false }));
      return;
    }

    try {
      const response = await fetch(`/api/music/playback?id=${encodeURIComponent(track.id)}`);
      const payload = (await response.json()) as {
        playback?: { url: string; expiresAt: number } | null;
        error?: string;
      };

      if (!payload.playback?.url) {
        setPlayback({
          currentTrack: null,
          error: payload.error ?? playbackFallbackError,
          playing: false,
          url: null,
        });
        return;
      }

      setPlayback({
        currentTrack: track,
        error: null,
        playing: true,
        url: payload.playback.url,
      });

      window.setTimeout(() => {
        void audioRef.current?.play().catch(() => {
          setPlayback({
            currentTrack: null,
            error: playbackFallbackError,
            playing: false,
            url: null,
          });
        });
      }, 0);
    } catch {
      setPlayback({
        currentTrack: null,
        error: playbackFallbackError,
        playing: false,
        url: null,
      });
    }
  }

  return (
    <>
      <button
        aria-controls="music-drawer"
        aria-expanded={open}
        className="rounded-full border border-white/25 bg-black/10 px-4 py-2 text-xs tracking-wide text-white/80 backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {drawerButtonLabel}
      </button>

      {open ? (
        <aside
          className="absolute right-5 top-20 z-20 w-full max-w-sm rounded-3xl border border-white/15 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-xl sm:right-10"
          id="music-drawer"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold tracking-[0.2em] text-white/90">{drawerTitle}</h2>
              <p className="mt-2 text-xs text-white/60">
                {drawerDescription.replace("mock 演示曲目", "内置舒缓曲目")}
              </p>
            </div>
            <button
              className="rounded-full border border-white/15 px-3 py-1 text-[0.65rem] text-white/70"
              onClick={() => setOpen(false)}
              type="button"
            >
              {closeButtonLabel}
            </button>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleSearch}>
            <label className="block text-xs text-white/75" htmlFor="music-search-input">
              {searchLabel}
            </label>
            <input
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/35"
              id="music-search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              value={query}
            />
            <button
              className="rounded-full border border-cyan-300/45 bg-cyan-300/15 px-4 py-2 text-xs tracking-[0.18em] text-cyan-50 transition hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
              type="submit"
            >
              {loading ? loadingLabel : submitLabel}
            </button>
          </form>

          {results.error ? <p className="mt-4 text-xs text-amber-200">{results.error}</p> : null}
          {playback.error ? <p className="mt-4 text-xs text-amber-200">{playback.error}</p> : null}

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs text-white/70">
              {playback.currentTrack ? `正在播放：${playback.currentTrack.title}` : "未选择音乐"}
            </p>
            <label className="mt-3 block text-xs text-white/70" htmlFor="music-volume">
              音乐音量
            </label>
            <input
              className="mt-2 w-full accent-cyan-200"
              id="music-volume"
              max="100"
              min="0"
              onChange={(event) => setVolume(Number(event.target.value))}
              type="range"
              value={volume}
            />
            <audio loop onError={() => setPlayback((current) => ({ ...current, error: playbackFallbackError }))} ref={audioRef} src={playback.url ?? undefined}>
              <track kind="captions" />
            </audio>
          </div>

          <ul className="mt-4 space-y-3">
            {results.tracks.map((track) => (
              <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" key={track.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-white">{track.title}</p>
                  <button
                    aria-label={`${playback.currentTrack?.id === track.id && playback.playing ? "暂停" : "播放"} ${track.title}`}
                    className="rounded-full border border-cyan-200/40 px-3 py-1 text-xs text-cyan-50"
                    onClick={() => void handlePlay(track)}
                    type="button"
                  >
                    {playback.currentTrack?.id === track.id && playback.playing ? "暂停" : "播放"}
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                  <span>{track.artist}</span>
                  <span aria-hidden="true">\u00b7</span>
                  <span>{track.source}</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </>
  );
}
