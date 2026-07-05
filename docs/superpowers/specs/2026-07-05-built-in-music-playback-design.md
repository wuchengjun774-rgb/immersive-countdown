# Built-in Music Playback Design

## Goal

Add a deploy-safe music playback feature using built-in calming audio tracks, so users can search, select, play, pause, adjust volume, and loop music without relying on third-party music platform authorization.

## Scope

- Use bundled/demo track metadata and playback URLs served through the existing music adapter boundary.
- Add a playback API that resolves a track id to a playable URL.
- Extend the music drawer with play/pause controls, current track display, volume control, and non-blocking error handling.
- Keep countdown behavior independent from music failures.

## Non-goals

- Do not scrape or bypass third-party music platforms.
- Do not add user uploads.
- Do not require login for music playback.

## Architecture

The existing mock music adapter remains the source of searchable demo tracks. A new `/api/music/playback` route resolves a selected track id into a short-lived playback URL. `MusicDrawer` owns client-side audio state through a browser `<audio>` element and exposes simple controls. Audio load/play failures show a warning without interrupting timer state.

## Testing

- Adapter tests cover playback URL resolution for known and unknown tracks.
- API tests cover successful resolution, missing id, unknown id, and adapter failure.
- Component tests cover search, play button, pause state, volume control, and error fallback.
- E2E smoke coverage should confirm music failures stay non-blocking.
