# Deployment checklist

This first release needs these production dependencies configured before public traffic.

## Required services

- PostgreSQL database for Prisma production data.
- Email delivery service for one-time passcodes.
- Approved WeChat Open Platform app with `WECHAT_CLIENT_ID` and `WECHAT_CLIENT_SECRET`.
- ICP/备案-approved public domain for the WeChat callback URL.
- CDN or edge cache for static assets under `public/`, including ocean media.

## Environment variables

- `DATABASE_URL`: production PostgreSQL connection string.
- `AUTH_SECRET`: strong Auth.js secret. Do not rely on development fallback behavior.
- `EMAIL_OTP_ENDPOINT`: HTTPS endpoint used to deliver email OTP codes.
- `EMAIL_OTP_API_KEY`: bearer token for the email delivery endpoint, if required.
- `EMAIL_OTP_FROM`: sender address for OTP messages.
- `WECHAT_CLIENT_ID`: approved WeChat app id.
- `WECHAT_CLIENT_SECRET`: approved WeChat app secret.
- `NEXTAUTH_URL`: canonical public site URL.

## CI and acceptance testing

- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`: optional CI/test override when Playwright managed browsers are unavailable.

## Database migration

1. Back up the production database.
2. Build the release artifact from the reviewed commit.
3. Set the production `DATABASE_URL`.
4. Run `pnpm exec prisma migrate deploy` against PostgreSQL.
5. Verify the Auth.js tables, `UserSettings`, `TimerSession`, and `EmailOtpChallenge` tables exist.
6. Run a smoke test for login, timer sync, settings, and account deletion.

## Rollback

1. Stop new deployments and route traffic back to the previous release.
2. Restore the database backup if the release introduced incompatible data changes.
3. Re-run smoke tests on the previous release.
4. Keep failed release logs for auth, timer sync, and Prisma migration diagnosis.

## Privacy and compliance checks

- Publish a privacy policy describing timer sessions, account identifiers, email OTP delivery, and WeChat login data.
- Confirm account deletion removes the authenticated user's data.
- Confirm no real secrets are committed to the repository.
- Confirm music integrations stay mock-only unless platform authorization is approved.
- Confirm CDN caching does not cache authenticated API responses.
