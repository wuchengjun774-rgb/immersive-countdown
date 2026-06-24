# Task 6 Report - Email OTP and WeChat Authentication

Date: 2026-06-24
Worktree: `C:\Users\Lenovo\Documents\安装skill\.worktrees\immersive-countdown`

## Scope completed

- Added Auth.js configuration in `src/auth/config.ts`
- Added WeChat OAuth provider factory in `src/auth/wechat-provider.ts`
- Preserved and used the existing OTP helper/test work in `src/auth/otp.ts` and `src/auth/otp.test.ts`
- Added Auth.js route handler in `src/app/api/auth/[...nextauth]/route.ts`
- Added login page with email OTP request/submit actions and WeChat sign-in action in `src/app/login/page.tsx`
- Added `next-auth@5.0.0-beta.31` and `@auth/prisma-adapter@2.11.2`
- Expanded `prisma/schema.prisma` for Auth.js Prisma adapter compatibility with database sessions
- Added a deterministic follow-up Prisma migration for the adapter models and user columns
- Added an auth-side regression test for the Prisma schema contract

## Key implementation notes

1. OTP validity remains the required `600_000` ms window.
2. `timingSafeEqual` is protected by a pre-check on hash length so malformed stored hashes return `false` instead of throwing.
3. Email OTP flow is implemented with:
   - an in-memory OTP store scoped to the server process
   - request cooldown enforcement via `canRequestOtp`
   - hash-only storage of OTP values
   - optional outbound delivery via `EMAIL_OTP_ENDPOINT` and `EMAIL_OTP_API_KEY`
4. Missing email delivery configuration does not break the build. Requests still complete safely without rendering or committing any secrets.
5. WeChat provider reads `WECHAT_CLIENT_ID` and `WECHAT_CLIENT_SECRET` when present and otherwise uses inert placeholder values so builds stay safe.
6. Auth.js is configured with:
   - `PrismaAdapter(prisma)`
   - `session.strategy = "database"`
   - providers for email OTP and WeChat
   - `/login` as the sign-in page
7. A safe fallback auth secret is used when `AUTH_SECRET` / `NEXTAUTH_SECRET` is absent so production builds do not fail during this task.

## Assumptions

- External email and WeChat services are not exercised in tests and are intentionally mocked/deferred through inert configuration behavior.
- The login page is acceptable as a server-action-based auth entry point for the current scope.
- The installed `@auth/prisma-adapter` runtime only required the standard `Account`, `Session`, and `VerificationToken` models for the present configuration; `Authenticator` was intentionally not added because this task does not enable passkeys/WebAuthn.

## Commands run

### Dependency installation

```powershell
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' add next-auth @auth/prisma-adapter
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' add next-auth@beta
```

Result:
- Installed `@auth/prisma-adapter@2.11.2`
- Corrected `next-auth` from v4 latest to `5.0.0-beta.31` to match the required Auth.js export shape

### TDD verification for OTP

```powershell
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' test src/auth/otp.test.ts
```

Observed red:
- failed first because `src/auth/otp.ts` did not exist

Observed green after implementation:
- 6 tests passed

### Required final verification

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' test src/auth
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' lint
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' build
```

Results:
- `pnpm prisma format`: PASS
- `pnpm prisma validate`: PASS
- `pnpm prisma generate`: PASS
- `pnpm prisma migrate dev --name add-authjs-adapter-models --create-only`: FAIL (`Schema engine error` against the local SQLite datasource in this environment)
- `pnpm prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`: PASS (used to generate deterministic SQL for `prisma/migrations/20260624170600_add_authjs_adapter_models/migration.sql`)
- `pnpm prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`: PASS (`No difference detected.` consistency check)
- `pnpm test src/auth`: PASS (`2` files, `8` tests)
- `pnpm lint`: PASS
- `pnpm build`: PASS

## Files changed

- `package.json`
- `pnpm-lock.yaml`
- `src/auth/config.ts`
- `src/auth/wechat-provider.ts`
- `src/auth/otp.ts`
- `src/auth/otp.test.ts`
- `src/auth/prisma-schema.test.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/login/page.tsx`
- `prisma/schema.prisma`
- `prisma/migrations/20260624170600_add_authjs_adapter_models/migration.sql`
- `.superpowers/sdd/task-6-report.md`

## Concerns / follow-up

1. Email OTP storage is intentionally in-memory for this scoped plumbing task, so codes do not persist across server restarts.
2. WeChat endpoints and placeholders are wired safely, but real end-to-end WeChat login still depends on approved Open Platform credentials and callback domain setup.
3. `prisma migrate dev` could not create the migration locally because Prisma returned a schema-engine error in this environment, so the committed migration SQL was generated with `prisma migrate diff` instead.
