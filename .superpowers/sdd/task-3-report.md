# Task 3 Report

## Status

Implemented the focus/break mode state machine, local timer persistence, and the React countdown hook.

## Changes

- Added the default 25/5 minute, four-round focus configuration.
- Added focus-to-break and break-to-next-focus phase advancement.
- Added localStorage save/restore, including conversion of expired running timers to completed.
- Added a countdown hook that recalculates remaining time from `Date.now()` every 250 ms.
- Added tests for defaults, phase advancement, persistence recovery, and expired completion.

## Verification

- Focused: `pnpm test src/features/timer/mode-machine.test.ts src/features/timer/use-countdown.test.tsx` — 2 files, 8 tests passed.
- Full: `pnpm test` — 4 files, 13 tests passed.
