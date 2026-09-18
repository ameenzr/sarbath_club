# Sarbath Club — agent context handoff

Generated 18 September 2026. This is a project handoff, not a verbatim chat export or the internal compaction summary. It contains no private secret values.

## Purpose and workspace

Build a juice bar kiosk/browser reaction tap game for Sarbath Club, with verified coupon claims and staff redemption.

- Workspace: `C:\Users\Ameen\projects\sarbath_club`
- Shell: PowerShell on Windows.
- GitHub: https://github.com/ameenzr/sarbath_club
- Branch: `main`, upstream `origin/main`.
- Last completed push: commit `61edc785c5f2e3c39311002bf00766072047149d` (`61edc78`).
- Preview: https://sarbath-club-preview.pages.dev/
- Local preview normally uses http://127.0.0.1:8788/.

## Confirmed owner requirements

1. Customers play first, without entering name/mobile or completing verification.
2. Only after winning, they enter name and mobile, complete verification, and claim a coupon.
3. Unlimited plays; failed plays may be retried immediately. The owner explicitly selected “Retry immediately — unlimited plays.” This supersedes the earlier contradictory “try again tomorrow” wording and the old daily phone limit.
4. Estimated reaction of 120–449 ms wins. Below 120 ms, tapping before the flash, 450 ms or slower, and an expired play do not win.
5. Reward: one free **sarbath**.
6. Coupon validity: one week (7 days).
7. Every normalized phone number may have only one coupon within its validity period. After expiry, it may claim again by winning. Current implementation interpretation: redemption does not shorten that eligibility period; confirm only if the owner changes this rule.
8. Show the winning code, prize terms, and expiry; customer presents the code to staff at the counter.
9. Retain customer details for 30 days, with automatic removal. No customer deletion-request UI/contact is requested.
10. Owner previously authorized setting the GitHub remote and pushing everything; that original push was completed. The new changes described below are not yet committed, pushed, or deployed.

## Technology and files

- React + Vite frontend, Cloudflare Pages Functions API, Cloudflare D1 SQLite.
- `src/App.jsx`: customer game, Turnstile component, staff interface, privacy page.
- `src/api.js`: API client and server-observed connection samples.
- `src/style.css`: existing branded styling.
- `server/core.js`: timing, plays, coupon claims, redemption, retention, rate limits.
- `functions/api/[[path]].js`: all API routes.
- `migrations/`: additive SQL migrations.
- `worker/cleanup.js`: scheduled retention cleanup.
- `scripts/deploy-preview.js`: deployment helper that temporarily uses preview Wrangler configuration and restores the local file.
- Requirements/docs: `PRD.md`, `TASKS.md`, `README.md`, `docs/api.md`, `docs/decisions.md`, `docs/operations.md`, `docs/test-report.md`, `docs/timing-validation.md`.
- Tests: `tests/core.test.js`, `tests/browser/ui.spec.js`, `tests/browser/live.spec.js`.
- Preserve owner-supplied `SARBATH CLUB logo and colours.pdf` and `logo backgroundless.png`. Public logo: `public/logo.png`.
- Palette: blue `#1E5FAF`, cream `#F4E7D3`, brown `#8B4A1F`, gold `#E6B85C`, white.

Commands from `package.json`:

```powershell
npm run check
npm test
npm run build
npm run db:local
npm run preview
npm run test:e2e
npm run deploy:preview
```

`check` runs TypeScript parsing/module checks with JS checking disabled; do not describe it as strict type checking. Browser tests need the local API/preview on port 8788. Wrangler may need elevated sandbox access for its logs/network. Inspect running processes before starting a duplicate server.

## Cloudflare setup

- Account ID: `2bbb5d7a6d1b537e5e61c8138c5275a6`.
- Pages project: `sarbath-club-preview`.
- Preview D1 database: `sarbath-club-preview-db`.
- Preview D1 ID: `cc5eaccb-b5eb-42c6-973b-a16b2cf5fdce` (APAC).
- `wrangler.toml`: local config with dummy database ID `00000000-0000-0000-0000-000000000001`.
- `wrangler.preview.toml`: actual preview D1 binding, `APP_ENV=preview`, `GAME_ENABLED=false`.
- `wrangler.cleanup.preview.toml`: worker `sarbath-club-preview-cleanup`, hourly cron `0 * * * *`, `workers_dev=false`.
- Public Turnstile site key: `0x4AAAAAAE7jL3Poyh4vtvKG`, tracked in `.env.production`.
- Widget: Managed, preview hostname `sarbath-club-preview.pages.dev`.
- Preview secrets `TURNSTILE_SECRET` and `STAFF_PASSWORD` were saved by the owner; names/encrypted existence were verified. Never print/read their values into chat or this handoff.
- Ignored local `.env.local` and `.dev.vars` use official Turnstile test credentials and local-only staff password. Keep these ignored.
- `.gitignore` excludes dependencies, build output, Wrangler state, local environment/secret files, reports, backups, and intermediate branding images. `.env.example` and public-only `.env.production` are exceptions.

The remote game remains disabled. Do not silently enable it: real device timing, actual verification/staff login, and release checks remain outstanding. The local API permits local testing despite the remote release flag.

Last known deployed Pages build: https://6d9d8142.sarbath-club-preview.pages.dev/
Last known cleanup worker version: `21512517-c27c-4a26-b67a-6a33840ac6ee`.

## State before the latest customer-flow change

The earlier flow collected identity and Turnstile verification before play, enforced one play per phone/day, and issued the coupon automatically on a win. It supported staff search/redemption, reconnect recovery, seven-day prize snapshots, and 30-day retention.

Earlier local core/browser checks passed, including official test-key verification and five scripted approximately 300 ms taps. Observed timing differences were approximately 6–10 ms against browser intervals; this is not physical-device precision validation. The remote widget frame loaded, but headless testing did not obtain a real token. An incorrect remote staff login returned 401; a correct owner-password login has not been verified. Remote attempts were zero at the last check.

Existing deployed migrations:

- `0001_initial.sql`: old attempts/sessions, daily uniqueness and supporting tables.
- `0002_maintenance.sql`: maintenance/index support.
- `0003_prize.sql`: one free sarbath, 604800000 ms validity.
- `0004_retention.sql`: 30 days, no deletion contact, approved configuration.

## Important: latest implementation is PARTIAL

The owner interrupted implementation to request this handoff. The new backend edits have not been tested. The frontend still uses the old flow. Do not claim the latest change is complete or deploy it yet.

Verified working-tree changes immediately before creating this file:

- Modified `server/core.js`.
- Modified `functions/api/[[path]].js`.
- Untracked `migrations/0005_play_then_claim.sql`.
- This new handoff file.

### New migration, not applied anywhere

`0005_play_then_claim.sql` adds:

- `plays`: anonymous timing results with prize/config snapshots, no name/phone.
- `play_sessions`: bearer-session hash and server timing data.
- `coupons`: identity, code, issuance/expiry, redemption; unique coupon per play.
- `coupon_locks`: one row per phone, pointing to the coupon and its expiry.

It copies old attempts/sessions/winning coupons, preserving IDs and issued codes. For legacy phones with several coupons, the lock uses the latest expiry so a new claim waits until prior validity ends. Old tables remain for compatibility/retention. Migration validity and legacy migration behavior still need tests.

### Backend edits already authored

`server/core.js` now:

- Reads sessions from new tables and left joins coupons.
- Changes `reserve` signature to `(db, token, config, baseline, now)` and creates anonymous plays.
- Finalizes timing only, without issuing a coupon.
- Adds `claim(db, token, name, phone, now, makeCode)` requiring a stored winning play.
- Issues coupons in a D1 batch with a phone lock; retries coupon-code collisions up to five times.
- Returns an already issued coupon for repeated claims on the same proof.
- Rejects a phone with a coupon whose expiry is greater than the claim time (`active_coupon`, 409).
- Starts the seven-day validity at successful claim issuance. This is an implementation choice aligned with the requested claim sequence, not a separately quoted owner decision.
- Redeems from `coupons`.
- Adds new-table cleanup: customer records age from coupon issuance; old anonymous plays are removed after retention when no retained coupon references them.
- Still contains legacy-table cleanup and older helpers where compatibility is useful.

API edits now:

- `/api/flash` no longer validates identity, phone-limits starts, or verifies Turnstile. It still checks origin, release flag, server-observed connection samples, and IP abuse limits.
- Adds `/api/claim`: bearer winning proof, name/mobile validation, server-side Turnstile verification, then claim.
- An already claimed proof returns the coupon before attempting to reverify a consumed Turnstile token (idempotent retry).
- Staff search joins `coupons` with `plays`.
- Turnstile action remains `play` in the existing widget and server verifier; any renaming must change both sides together.

Review batch atomicity/races, rollback, lock behavior, API error mapping and retention before considering this ready.

## Remaining work to complete latest request

1. Update `src/App.jsx` customer flow:
   - Welcome/start screen without name, phone, or Turnstile.
   - Preserve wait/flash/tap timing and single-tap locking.
   - Winning result without a code shows identity form and Turnstile, then calls `/api/claim` using that play's bearer credential.
   - Successful claim shows code, free sarbath terms, expiry and counter instructions.
   - Friendly `active_coupon` message without exposing another customer's code.
   - Immediate replay after too early/too slow/expired; create a new UUID for each new play.
   - Refresh/recovery handles an unclaimed win and an already issued coupon; interrupted timing must not restart the same timer.
   - Remove old “daily limit”, “today's play” and “tomorrow” copy.
   - Reset verification after failed claim attempts as needed; prevent duplicate submissions.
2. Update `src/api.js` friendly errors for `win_required` and `active_coupon` and any obsolete daily-limit messages.
3. Update privacy/docs to explain anonymous play, identity only at claim, one coupon validity period per phone, immediate retries, seven days from issuance, and 30-day retention from collection/claim.
4. Update tests for the changed `reserve` signature and new schema. Existing tests still describe the old flow; add migration 0005 to test setup.
5. Meaningful checks:
   - Anonymous start requires no personal fields/verification.
   - Win has no coupon until a verified claim.
   - Lost/expired/reserved proofs cannot claim; invalid verification cannot issue a coupon.
   - Same-proof retries are idempotent.
   - Concurrent claims for the same normalized phone issue only one coupon; +91/0091/local formats normalize identically.
   - Redeemed coupon blocks a new claim until its original expiry; a fresh winning claim is allowed at exact expiry.
   - Seven-day expiry snapshots; collision retries and failed batches do not leave stray coupons/locks.
   - Legacy coupons survive migration and remain searchable/redeemable.
   - Retention removes identity/locks appropriately without deleting retained coupons prematurely.
   - Browser UI starts without fields/widget, shows the form only after a win, handles claim/replay/recovery, and staff redemption works.
6. Apply migration locally, run appropriate checks/tests and inspect the resulting UI. Keep production/preview DB unchanged until implementation is complete and deployment scope is settled.
7. Report the outcome accurately; do not reuse the prior test report as proof of these new edits.

## Collaboration guidance

Proceed with routine reversible implementation work without repeatedly requesting permission. Preserve unrelated user changes. Use concise progress messages during sustained work. Do not spawn subagents unless the owner or applicable project instructions explicitly ask. Use `rg` for searches and `apply_patch` for authored edits. Inspect project instructions if resuming in a new environment.

## Suggested prompt for a new agent

> Read CONTEXT_HANDOFF.md in C:\Users\Ameen\projects\sarbath_club and inspect the actual working tree. Finish the partially implemented customer-flow change: anonymous unlimited plays with immediate retries, identity and Turnstile only after a 120–449 ms win, one seven-day coupon per phone until expiry, free sarbath, 30-day detail retention. Complete frontend, backend review, docs and meaningful tests. Do not enable the remote game or expose secrets. Existing backend edits and migration 0005 are untested and the frontend still uses the old flow.
