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

const drawerButtonLabel = "打开音乐抽屉";
const drawerTitle = "音乐";
const drawerDescription = "当前提供内置舒缓曲目，音乐异常也不会影响计时。";
const closeButtonLabel = "关闭";
const searchLabel = "搜索音乐";
const searchPlaceholder = "搜索内置曲目，例如海岸、雨、冥想";
const submitLabel = "搜索";
const loadingLabel = "搜索中…";
const fallbackError = "Music search is temporarily unavailable";
const playbackFallbackError = "Music playback is temporarily unavailable";
const playbackGestureHint = "音频已准备好，请再点一次播放。";

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

  async function playCurrentAudio(track: Track) {
    try {
      await audioRef.current?.play();
      setPlayback((current) => ({
        ...current,
        currentTrack: track,
        error: null,
        playing: true,
      }));
    } catch {
      setPlayback((current) => ({
        ...current,
        currentTrack: track,
        error: playbackGestureHint,
        playing: false,
      }));
    }
  }

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

    if (playback.currentTrack?.id === track.id && playback.url) {
      await playCurrentAudio(track);
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
        playing: false,
        url: payload.playback.url,
      });

      window.setTimeout(() => {
        void playCurrentAudio(track);
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
              <p className="mt-2 text-xs text-white/60">{drawerDescription}</p>
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
            <audio
              loop
              onError={() => setPlayback((current) => ({ ...current, error: playbackFallbackError }))}
              ref={audioRef}
              src={playback.url ?? undefined}
            />
          </div>

          <ul className="mt-4 space-y-3">
            {results.tracks.map((track) => {
              const isCurrentTrack = playback.currentTrack?.id === track.id;
              const buttonVerb = isCurrentTrack && playback.playing ? "暂停" : "播放";

              return (
                <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" key={track.id}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-white">{track.title}</p>
                    <button
                      aria-label={`${buttonVerb} ${track.title}`}
                      className="rounded-full border border-cyan-200/40 px-3 py-1 text-xs text-cyan-50"
                      onClick={() => void handlePlay(track)}
                      type="button"
                    >
                      {buttonVerb}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                    <span>{track.artist}</span>
                    <span aria-hidden="true">·</span>
                    <span>{track.source}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      ) : null}
    </>
  );
}
