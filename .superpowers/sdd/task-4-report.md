# Task 4 Report

## Status

Implemented the immersive timer home screen with `AppShell`, `OceanBackground`, `TimerFace`, and the page integration, including leisure mode, start/pause/resume controls, a dynamic background toggle, reduced-motion fallback, video error fallback, and the follow-up accessibility and compatibility fixes from review.

Added the requested follow-up regression coverage for tab keyboard behavior in `src/features/timer/timer-face.test.tsx` without changing `TimerFace` UI behavior.

## Changes

- Added `AppShell` with the product heading, dynamic background toggle, centered responsive layout, and footer copy.
- Added `OceanBackground` with static WebP fallback, optional looping video slot, `onError` fallback, and `prefers-reduced-motion` handling.
- Added `TimerFace` with accessible mode tabs, a live timer output, and start/pause/resume controls for focus and leisure modes.
- Updated `useCountdown()` to expose `pause()` and `resume()`, and to avoid touching `window` during server prerendering.
- Updated `src/app/globals.css` with the ocean-themed global colors and body margin reset used by the immersive layout.
- Wired the home page to render the full shell and timer experience.
- Added focused tests for app shell toggling, page rendering, server prerender safety, and timer interactions.
- Took over the existing `public/backgrounds/morning-ocean.png` and `public/backgrounds/morning-ocean.webp` assets.
- Follow-up review fixes:
  - `OceanBackground` now supports both `addEventListener`/`removeEventListener` and legacy Safari `addListener`/`removeListener`.
  - `TimerFace` tabs now use roving `tabIndex`, ArrowLeft/ArrowRight plus Home/End keyboard switching, focus movement, and `aria-controls`/`aria-labelledby` tab-to-panel wiring.
  - Added regression tests for legacy `matchMedia` listeners and keyboard-accessible tab behavior.
- Keyboard coverage follow-up:
  - Expanded `src/features/timer/timer-face.test.tsx` to cover vertical tab navigation with `ArrowDown`, reverse navigation with `ArrowLeft` and `ArrowUp`, and first/last tab shortcuts with `Home` and `End`.
  - Left production UI behavior unchanged because the existing `TimerFace` implementation already handled those keyboard paths correctly.

## Verification

- Initial TDD RED: `pnpm test src/components/app-shell.test.tsx src/app/page.test.tsx src/app/page.server.test.tsx` failed because `page.tsx` imports did not resolve under Vitest.
- Initial TDD GREEN focused: `pnpm test src/components/app-shell.test.tsx src/components/ocean-background.test.tsx src/app/page.test.tsx src/app/page.server.test.tsx src/features/timer/timer-face.test.tsx` - 5 files, 10 tests passed.
- Initial final full: `pnpm test` - 9 files, 31 tests passed.
- Initial final lint: `pnpm lint` - passed.
- Initial final build: `pnpm build` - passed.
- Review-fix TDD RED: `pnpm test src/components/ocean-background.test.tsx src/features/timer/timer-face.test.tsx` failed with 3 expected failures:
  - `mediaQuery.addEventListener is not a function` on the legacy Safari listener path.
  - Tabs were missing roving `tabIndex`.
  - No `tabpanel`/ARIA linkage existed for the mode tabs.
- Review-fix TDD GREEN focused: `pnpm test src/components/ocean-background.test.tsx src/features/timer/timer-face.test.tsx` - 2 files, 9 tests passed.
- Review-fix final full: `pnpm test` - 9 files, 34 tests passed.
- Review-fix final lint: `pnpm lint` - passed.
- Review-fix final build: `pnpm build` - passed.
- Keyboard-coverage TDD RED: temporarily removed `ArrowDown`, `ArrowLeft`, `ArrowUp`, `Home`, and `End` handling from `src/features/timer/timer-face.tsx`, then ran `pnpm test src/features/timer/timer-face.test.tsx` - 1 file failed with 2 expected regression failures:
  - `supports reverse and vertical arrow navigation for tabs`
  - `supports Home and End keyboard shortcuts for tabs`
- Keyboard-coverage TDD GREEN focused: restored the existing handler and ran `pnpm test src/features/timer/timer-face.test.tsx` - 1 file, 7 tests passed.
- Keyboard-coverage broader verification: `pnpm test` - 9 files, 36 tests passed.

## Concerns

- `ffmpeg` was not available in this environment, so `public/backgrounds/morning-ocean-loop.mp4` was not generated. The UI still degrades cleanly to the static WebP background.

## Commit

- Task 4 implementation SHA: `13b3e0cfbf719a1941cec39163f866392463d51c`
- Task 4 review-fix SHA: `1741a446824504e8f330c6b35a3180753aa267fb`

## MP4 asset fix after re-review
- Added public/backgrounds/morning-ocean-loop.mp4 so the dynamic ocean background source exists instead of always falling back.
- Added server-side regression test to assert the required video asset is shipped and non-empty.
- Verified MP4 header contains ftyp and file size is 829284 bytes.
- Ran: pnpm test src/app/page.server.test.tsx src/components/ocean-background.test.tsx src/features/timer/timer-face.test.tsx -> 3 files, 13 tests passed.
- Ran: pnpm test -> 9 files, 37 tests passed.
- Ran: pnpm build -> Next.js production build passed.

