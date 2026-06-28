# Task 10 Report: Production Acceptance Coverage

## Summary

- Added production-oriented Playwright E2E coverage for timer restore, mobile viewport acceptance, ocean background fallback, music API failure handling, real offline sync queue/reconnect behavior, and auth fallback screens.
- Updated Playwright config for Chromium project execution, parallel runs, traces on failure, and a portable local dev server command.
- Fixed timer hydration so server/client markup does not diverge while still restoring persisted local timer state after mount.
- Added deployment checklist covering database, email, WeChat, ICP/domain requirements, CDN, environment variables, migrations, rollback, and privacy policy items.
- Added baseline security headers in `next.config.ts`.

## Files changed

- `tests/e2e/timer.spec.ts`
- `tests/e2e/offline-sync.spec.ts`
- `tests/e2e/auth.spec.ts`
- `docs/deployment.md`
- `playwright.config.ts`
- `next.config.ts`
- `src/features/timer/timer-face.tsx`
- `src/features/timer/timer-face.test.tsx`
- `src/features/timer/sync-queue.ts`
- `src/features/timer/use-countdown.ts`
- `src/features/timer/use-countdown.test.tsx`

## Verification

All commands were run from `C:\Users\Lenovo\Documents\安装skill\.worktrees\immersive-countdown`.

- `pnpm test` — passed: 28 files, 105 tests.
- `pnpm lint` — passed.
- `pnpm build` — passed.
- `pnpm test:e2e` — passed: 9 Playwright tests, including mobile viewport timer acceptance and offline queue reconnect flushing.

For the local desktop environment, E2E was run with:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:\Users\Lenovo\AppData\Local\ms-playwright\chromium-1208\chrome-win64\chrome.exe'
pnpm test:e2e
```

This is optional when the Playwright-managed Chromium version is installed normally.

## Notes

- The timer hook now renders a deterministic default state initially, then restores `localStorage` state in a queued client-side hydration step. This avoids hydration mismatch while preserving reload recovery.
- Unit tests that render `useCountdown` now flush the hydration microtask to prevent cross-test localStorage pollution.
- The deployment checklist explicitly marks PostgreSQL as a release gate because the current preview implementation is still Prisma SQLite-backed.
- The timer UI now writes completed sessions to the local sync queue and flushes queued records when the browser comes back online.
- The timer completion action has an in-flight guard so rapid duplicate clicks cannot enqueue duplicate sessions or skip focus phases.
