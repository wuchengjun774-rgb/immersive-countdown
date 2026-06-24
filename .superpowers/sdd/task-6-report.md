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

## Task 6 fix follow-up - 2026-06-24

### Review items addressed

- Replaced the predictable fallback auth secret with runtime gating in `src/auth/runtime.ts`; production without `AUTH_SECRET` / `NEXTAUTH_SECRET` now disables sign-in while still allowing the build to succeed.
- Replaced the custom WeChat provider with the installed Auth.js built-in WeChat provider, enabled only when `WECHAT_CLIENT_ID` and `WECHAT_CLIENT_SECRET` are present.
- Moved OTP persistence and cooldown state into Prisma-backed `EmailOtpChallenge` records.
- Split login feedback into explicit `not-configured`, `delivery-failed`, `rate-limited`, `expired`, `auth-unavailable`, invalid-code, and cancelled-WeChat paths.
- Stopped implying “code sent” when email delivery is unavailable or fails.
- Removed fabricated `@wechat.local` emails by adopting the built-in Auth.js WeChat profile mapping (`email: null`).

### TDD evidence

Red run before implementation:

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' test src/auth src/app/login/page.test.ts
```

Result:
- FAIL
- Missing modules: `src/auth/runtime.ts`, `src/auth/email-otp-service.ts`
- `src/auth/wechat-provider.test.ts` failed because the provider still returned placeholder credentials and custom profile semantics
- `src/auth/prisma-schema.test.ts` failed because `EmailOtpChallenge` was absent

Focused green after implementation:

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' test src/auth/runtime.test.ts src/auth/email-otp-service.test.ts src/auth/wechat-provider.test.ts src/auth/prisma-schema.test.ts src/app/login/page.test.ts
```

Result:
- PASS
- `5` files, `15` tests

### Required verification commands and exact results

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' prisma format
```

Result:
- PASS
- `Formatted prisma\schema.prisma in 11ms`

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' prisma validate
```

Result:
- PASS
- `The schema at prisma\schema.prisma is valid`

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' prisma generate
```

Result:
- PASS

Attempted first migration consistency command:

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code
```

Result:
- FAIL
- Prisma 7 removed `--to-schema-datamodel`; CLI instructed to use `--to-schema`

Successful migration consistency command:

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
```

Result:
- PASS
- Exit code `0`

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' test src/auth
```

Result:
- PASS
- `5` files, `19` tests

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' test src/app/login/page.test.ts
```

Result:
- PASS
- `1` file, `2` tests

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' lint
```

Result:
- PASS
- `eslint`

```powershell
$env:Path = 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
& 'C:\Users\Lenovo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' build
```

Result:
- PASS
- Next.js production build completed successfully

### Files added or changed for the fix

- `prisma/schema.prisma`
- `prisma/migrations/20260624194500_add_email_otp_challenge/migration.sql`
- `src/auth/config.ts`
- `src/auth/runtime.ts`
- `src/auth/runtime.test.ts`
- `src/auth/email-otp-service.ts`
- `src/auth/email-otp-service.test.ts`
- `src/auth/wechat-provider.ts`
- `src/auth/wechat-provider.test.ts`
- `src/auth/prisma-schema.test.ts`
- `src/app/login/page.tsx`
- `src/app/login/messages.ts`
- `src/app/login/page.test.ts`

## Expired OTP sign-in path fix
- Extracted email OTP authorize logic into src/auth/email-otp-sign-in.ts.
- Expired OTP results now throw a CredentialsSignin subclass with code='expired'.
- Login server action maps that Auth.js error to /login?status=expired; invalid credentials remain on the generic invalid-code path.
- Added focused tests for expired vs invalid sign-in mapping.
- Ran: pnpm test src/auth -> 6 files, 24 tests passed.
- Ran: pnpm test src/app/login/page.test.ts -> 1 file, 2 tests passed.
- Ran: pnpm lint -> passed.
- Ran: pnpm build -> passed.

