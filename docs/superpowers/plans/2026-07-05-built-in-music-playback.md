# Built-in Music Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add built-in calming music playback that works on the deployed Vercel site without third-party music authorization.

**Architecture:** Reuse the existing music adapter and drawer. Add a playback API to resolve track ids to local/demo audio URLs, then add browser audio controls inside `MusicDrawer`.

**Tech Stack:** Next.js App Router, React, Vitest, Testing Library, Playwright.

## Global Constraints

- Do not scrape or bypass third-party music platforms.
- Music failures must not stop countdown usage.
- Keep the implementation deploy-safe on Vercel.

---

### Task 1: Playback API

**Files:**
- Modify: `src/features/music/types.ts`
- Modify: `src/features/music/mock-adapter.ts`
- Modify: `src/features/music/mock-adapter.test.ts`
- Create: `src/app/api/music/playback/route.ts`
- Create: `src/app/api/music/playback/route.test.ts`

**Interfaces:**
- Consumes: `mockMusicAdapter.resolvePlayback(trackId: string)`
- Produces: `GET /api/music/playback?id=<trackId>` returning `{ playback: { url: string; expiresAt: number } }` or `{ playback: null, error?: string }`

- [ ] Write failing adapter and API tests.
- [ ] Run targeted tests and verify expected failures.
- [ ] Implement route and any needed type updates.
- [ ] Run targeted tests and verify pass.

### Task 2: Drawer Audio Controls

**Files:**
- Modify: `src/components/music-drawer.tsx`
- Modify: `src/components/music-drawer.test.tsx`

**Interfaces:**
- Consumes: `GET /api/music/playback?id=<trackId>`
- Produces: searchable track list with Play/Pause button, current track text, volume slider, looping `<audio>`, and non-blocking error message.

- [ ] Write failing component tests for play, pause, volume, and playback failure.
- [ ] Run tests and verify expected failures.
- [ ] Implement minimal audio UI and state.
- [ ] Run component tests and verify pass.

### Task 3: Verification and Deploy Handoff

**Files:**
- Modify only if tests reveal a necessary issue.

- [ ] Run `pnpm test`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm exec prisma generate && pnpm exec next build` with a PostgreSQL placeholder `DATABASE_URL`.
- [ ] Commit implementation.
- [ ] User pushes with GitHub Desktop and redeploys Vercel.
