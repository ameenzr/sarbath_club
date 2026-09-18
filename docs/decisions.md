# Implementation decisions

Updated 18 September 2026. Existing PRD, TASKS, and brand PDF preserved. No repository instructions or application code were present in the project root.

## Customer flow change — play then claim

Owner-requested change: customers play first without entering name/mobile or completing verification. Only after winning (120–449 ms reaction), the customer enters identity and completes Turnstile verification to claim a coupon via `/api/claim`. Unlimited plays with immediate replay on loss. Each phone may hold one active coupon at a time (7-day validity from claim issuance). Migration 0005 adds `plays`, `play_sessions`, `coupons`, and `coupon_locks` tables; legacy `attempts`/`sessions` remain for compatibility. Backend `reserve` is now anonymous (no name/phone), and `claim` is a separate step.

## Architecture

- React/Vite frontend with Pages Functions under `functions/api`. One origin for browser and API; local Vite proxies to Wrangler on port 8788.
- D1 reads use the primary through `withSession('first-primary')` when available. Atomic batch operations plus conditional SQL protect state transitions. No interactive BEGIN/COMMIT through the binding.
- Start retries use a browser-generated, cryptographically random bearer credential persisted in sessionStorage before sending. The server hashes it into an idempotency key; it is not a coupon authority or timing parameter. Anyone with this credential can recover that attempt, so never log it or place it in URLs.
- Sessions use server timing and delay. Connection sampling uses server-observed challenge/ack duration, which is bounded but still client-influenced. This remains an approximation and can be automated. Remote rewards stay disabled until timing acceptance.
- Demo prize values exist only as local configuration. Remote play fails closed unless explicitly enabled with complete production policy and non-test verification configuration.

## Defaults

Asia/Kolkata; minimum 120 ms; win below 450 ms; delay 1500–4500 ms; timeout 10 seconds after estimated appearance plus network allowance. Proposed diagnostic tolerance: p95 absolute error ≤50 ms and sample spread ≤150 ms, pending real-device validation and owner acceptance. No consolation offer.

## Human checkpoints

| ID | Status | Needed | Blocks |
|---|---|---|---|
| H-01 | resolved | Owner confirmed one free sarbath, valid 7 days from issuance. No additional purchase or serving restrictions were specified or added | Nothing for reward configuration |
| H-02 | resolved | Owner confirmed 30-day retention and no customer deletion feature. Default remains mobile/QR play per PRD; supported physical devices are validated in H-06 | Nothing for privacy configuration |
| H-03 | resolved | User completed signup/login; Wrangler verified the sole signed-in account on 18 September 2026 | Nothing |
| H-04 | resolved | Public site key supplied; STAFF_PASSWORD and TURNSTILE_SECRET confirmed encrypted in preview project and redeployed. Actual successful server verification remains a remote acceptance check | No further key entry needed |
| H-05 | pending | Approve measured timing error and abuse tolerance | Real rewards |
| H-06 | pending | Shop-network, real-phone, staff, printed-QR checks | Physical acceptance |
| H-07 | pending | Specific production release authorization if absent | Production release |
| H-08 | not required | No paid or destructive operations planned | Nothing |

Local work continues while these are pending. No human response has been inferred.

## Official references checked 18 September 2026

- [Vite setup](https://vite.dev/guide/): installed Node 24.15 supports the selected tooling.
- [D1 batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/): batch rolls back on statement failure.
- [Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/): D1 binding and build output configuration.
- [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/): server validation is mandatory; token retries require idempotent handling.

## Implementation evidence

Local customer and staff application implemented, D1 migrations applied, database/API suites and browser suites pass. The brand PDF was visually inspected and its logo rendered as `public/logo.png`; palette is #1E5FAF, #F4E7D3, #8B4A1F, white and #E6B85C. Scripted local timing differences were +6 to +10 ms over five trials; actual device acceptance remains pending. No production URL or reward terms have been invented.

Miniflare's stable test runtime uses compatibility date 2026-08-06. Patched undici/sharp overrides resolve the audit findings; Wrangler uses its own newer runtime. Recovery rehearsals and scheduler deployment require isolated remote resources. Local retention/config mechanisms exist, but owner-approved real settings are pending.

## Remote preview — 18 September 2026

- Sole signed-in Cloudflare account verified following the user's completion confirmation.
- Pages project: `sarbath-club-preview`; stable URL: https://sarbath-club-preview.pages.dev/; first deployment: https://cf6c2886.sarbath-club-preview.pages.dev/.
- Isolated APAC D1: `sarbath-club-preview-db`, ID `cc5eaccb-b5eb-42c6-973b-a16b2cf5fdce`; both migrations applied successfully.
- Root local configuration restored after deployment. Pages rejects a custom config path and account_id; `npm run deploy:preview` stages the named preview configuration temporarily, selects the verified account via child-process environment, and restores root config in finally.
- Smoke checks: homepage and staff route 200; config API 200 with enabled=false; Start rejected with game_unavailable; remote attempt count remains zero.
- Real verification/staff secret entries confirmed and site key configured in the production build. Deployment updated to https://1f7ccb45.sarbath-club-preview.pages.dev/. Invalid staff password returns unauthorized rather than configuration_required. Successful staff login and matching Turnstile verification remain to be exercised; private values were not read or requested.
- Customer play remains disabled pending owner policy, physical timing, recovery rehearsal and launch.

## Confirmed prize

Owner instruction: winning customer receives one free sarbath; coupon valid for a week. Configured expiry is exactly 604800000 milliseconds (7 × 24 hours) after the server finalizes the winning attempt. Staff must redeem before that timestamp. Changes apply to new attempts only; existing attempt prize/validity snapshots remain unchanged. No purchase conditions, serving restrictions or special redemption hours have been invented.

## Confirmed retention

Owner instruction: retain customer details for 30 days; no customer-facing deletion access is required. Privacy copy now explains automatic cleanup without a deletion-request section. Config's legacy deletion_contact column is empty and no longer exposed or required by the API. Approved config reflects the confirmed reward/privacy policy; GAME_ENABLED remains false pending launch acceptance. Cleanup runs hourly after deployment, so removal occurs on the next cleanup cycle after the retention period.

Preview privacy deployment: https://6d9d8142.sarbath-club-preview.pages.dev/. The isolated preview retention worker `sarbath-club-preview-cleanup` is deployed with `0 * * * *` schedule and preview D1 binding. Production cleanup is not deployed. Retention logic tests and live config checks pass; public customer deletion text removed.
