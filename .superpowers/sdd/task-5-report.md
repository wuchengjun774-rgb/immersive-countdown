# Task 5 Report: Persist user timer settings

Status: DONE

Implementation:
- Added Prisma 7 configuration with SQLite local development datasource fallback.
- Added Prisma models: User, UserSettings, TimerSession with the exact fields/relations from the task brief, including cascade deletes and unique keys.
- Added committed init migration SQL plus migration_lock.toml.
- Added src/lib/db.ts Prisma client singleton using the Prisma 7 better-sqlite3 adapter.
- Added settingsSchema/defaultSettings with exact bounds: focusMinutes 1..180, breakMinutes 1..60, rounds 1..12, motionBackground boolean.
- Added /api/settings GET/PUT route. It returns defaults without a user identity and persists only when x-user-id is present; this avoids faking authentication before auth exists.
- Added schema tests and API route tests.
- Added Vitest @ alias resolution needed for route-module tests.
- Ignored local SQLite database files under prisma/*.db and prisma/*.db-journal.

Assumptions:
- The plan did not specify a database provider. SQLite was chosen for deterministic local development and Prisma migration support.
- The plan did not define authentication. The API uses x-user-id as a temporary explicit identity boundary; unauthenticated GET returns defaults and unauthenticated PUT returns 401.

Commands and results:
- pnpm prisma format -> passed.
- pnpm prisma migrate dev --name init -> failed with `Schema engine error:` and no actionable details. Investigation showed `prisma validate` and `prisma generate` pass, schema-engine binary exists, and `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` can generate the expected SQL. The failure is isolated to migrate dev's schema-engine execution in this local environment.
- pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script -> passed and used to create the init migration SQL.
- pnpm prisma validate -> passed.
- pnpm prisma generate -> passed.
- pnpm test src/features/settings src/app/api/settings -> 2 files, 8 tests passed.
- pnpm migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code -> passed, No difference detected.
- pnpm test -> 11 files, 45 tests passed.
- pnpm lint -> passed.
- pnpm build -> passed.

---

Task 5 security fix addendum (post-review):

Fix details:
- Removed caller-controlled `x-user-id` handling from `src/app/api/settings/route.ts`.
- `GET /api/settings` now always returns `defaultSettings`, `persisted: false`, and `requiresUserIdentity: true`.
- `PUT /api/settings` still validates the JSON body with `settingsSchema`, returns `400` for invalid payloads, and returns `401` with `Authentication is required to persist settings` for valid payloads because trusted authentication does not exist yet.
- The route no longer calls Prisma for unauthenticated settings reads or writes, while leaving Prisma schema/client code intact for future authenticated persistence.
- Updated `src/app/api/settings/route.test.ts` to prove untrusted headers cannot read or persist settings and that Prisma mocks are never called.

Commands and exact results:
- `pnpm test src/app/api/settings/route.test.ts` (before route fix) -> failed: 1 file failed, 5 tests run, 3 failed, 2 passed. Failures showed GET still treated `x-user-id` as authenticated state and PUT still followed the persistence path.
- `pnpm test src/app/api/settings/route.test.ts` (after route fix) -> passed: 1 file, 5 tests passed.
- `pnpm test src/features/settings src/app/api/settings` -> passed: 2 files, 9 tests passed.
- `pnpm test` -> passed: 11 files, 46 tests passed.
- `pnpm lint` -> initially returned 1 warning in `src/app/api/settings/route.ts` for unused `_request`; after removing the unused parameter, `pnpm lint` passed cleanly.
- `pnpm build` -> passed. Next.js production build compiled successfully and included the dynamic `/api/settings` route.
