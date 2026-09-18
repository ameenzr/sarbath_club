# Sarbath Club — context handoff

Updated 19 September 2026. Project summary, not a chat export. No private secrets.

## Workspace and repository

- Windows PowerShell: C:\Users\Ameen\projects\sarbath_club
- GitHub: https://github.com/ameenzr/sarbath_club
- main tracks origin/main. External implementation commit a4e3f2b (“game first login next”) added anonymous play/claim. Follow-up fixes and evidence are included in the subsequent commit; inspect git log for its final hash.
- React/Vite frontend, Cloudflare Pages Functions API, D1 and separate hourly cleanup Worker.
- Key files: src/App.jsx, src/api.js, server/core.js, functions/api/[[path]].js, migrations/, worker/cleanup.js.
- Preserve user logo PDF/PNG and public/logo.png. Branding: blue #1E5FAF, cream #F4E7D3, brown #8B4A1F, gold #E6B85C.

## Confirmed requirements

Customers play anonymously first. Estimated 120–449 ms wins; below 120 ms, tapping before flash, >=450 ms or expiry do not win. Plays are unlimited with immediate retries (explicit owner clarification). Abuse throttles still apply.

After winning, collect name/mobile and complete Turnstile bot verification to claim one free sarbath. Coupon validity starts at issuance and lasts seven days. One normalized phone may claim only one coupon within that validity period, including after redemption; exact expiry permits a new winning claim. No OTP or proof of phone ownership.

Retain customer details 30 days from issuance, automatic cleanup, no customer deletion-request UI or marketing. Staff search by code/phone and atomically redeem before handover. Only a saved winning proof may claim. Repeated claims/taps recover the stored result. Refreshing a pending play never restarts its timer.

## Completed follow-up

- Corrected privacy, active-coupon errors and API docs: redeeming does not release the phone until expiry.
- Explained below-120 ms results as well as taps before flash.
- Reset timer reference, verification and diagnostics for a new play.
- Allowed replay after successful claim, retaining the previous code in sessionStorage and a visible disclosure.
- Rewrote PRD v1.1, updated task/runbook/timing/test docs and prepared docs/acceptance.md.
- Added simultaneous normalized-phone claim tests, redemption lock, exact expiry, 30-day removal, populated legacy migration and injected lock-write rollback.
- Fixed lifecycle test to redeem coupon IDs differing from play IDs.
- Live browser test actually claims using local Worker-to-Siteverify with official test credentials, refreshes and replays while retaining code.
- Added migration 0006 to correct future prize terms to seven days from issuance; preserves issued snapshots.
- Migrations 0001–0006 are applied locally and on preview; runtime deployments are complete. See docs/test-report.md.

## Verification and limits

Build and parser/module check pass (JS strict checking is disabled). All eleven Node tests pass with the final wording migration (47.8 seconds). All five browser tests passed in 51.2 seconds, including live local verified claim. Current scripted software timing differences: +21/+21/+12/+22/+22 ms; not independent physical measurement. Winning coupon screenshot reviewed.

Real remote Turnstile completion, correct staff-password login, actual phone/shop-network timing, printed production QR, recovery rehearsal and owner timing/abuse acceptance remain pending. Encrypted secret existence does not prove correct values. Do not enable real customer play silently.

## Cloudflare inventory

- Account 2bbb5d7a6d1b537e5e61c8138c5275a6.
- Preview Pages sarbath-club-preview: https://sarbath-club-preview.pages.dev/
- Updated deployment: https://ae06d082.sarbath-club-preview.pages.dev/
- D1 sarbath-club-preview-db: cc5eaccb-b5eb-42c6-973b-a16b2cf5fdce (APAC).
- wrangler.preview.toml: APP_ENV=preview, GAME_ENABLED=false.
- wrangler.toml: local dummy ID 00000000-0000-0000-0000-000000000001.
- Public Managed Turnstile site key 0x4AAAAAAE7jL3Poyh4vtvKG; allowed hostname sarbath-club-preview.pages.dev.
- Private TURNSTILE_SECRET and STAFF_PASSWORD configured by owner; never read/print/commit values. Ignored local .env.local/.dev.vars use official test credentials.
- Cleanup sarbath-club-preview-cleanup redeployed, version cd3ba866-debf-4f36-a4cc-0e5e73943da9, cron 0 * * * *, workers_dev=false, bound only to preview D1.
- Before migration, aggregate legacy attempts and sessions were both zero. No private SQL export was performed: automatic approval review rejected export as a possible personal-data copy. A safer Time Travel bookmark was recorded instead.
- Pre-migration bookmark: 00000019-00000000-000050ea-993ddbed630c76b79c44d008631534a7. Restoring it is destructive and requires separate authorization.
- Smoke: homepage/staff/privacy/config all 200, retention 30, enabled=false, anonymous flash 503 game_unavailable. Preview game remains disabled.

## Schema and operations

0005 adds anonymous plays/play_sessions and identity-bearing coupons/coupon_locks, preserving legacy IDs/codes and latest-expiry phone locks. 0006 adjusts future terms only. Claim and lock writes use one batch; code uniqueness collisions retry up to five times. Redemption does not change eligibility expiry.

Cleanup deletes expired coupons older than retention and cascades locks, then old anonymous plays without retained coupons and their sessions. Legacy records also receive cleanup. Migration precedes runtime deployment. Redeploy both Pages and the separate Worker when shared core changes; Pages does not update scheduled Worker code.

Commands: npm run check; npm test; npm run build; npm run db:local; npm run preview (127.0.0.1:8788); npm run test:e2e; npm run deploy:preview. Remote schema: npx wrangler d1 migrations apply DB --remote --config wrangler.preview.toml. Worker: npx wrangler deploy --config wrangler.cleanup.preview.toml.

deploy-preview.js temporarily stages preview config as root wrangler.toml then restores it. Stop local servers before that deployment. Backups/secrets/build/runtime/test output stay ignored.

## What next

1. Inspect final git/test report and migration status; do not repeat completed fixes.
2. Owner authorizes a temporary nonproduction acceptance session before changing preview GAME_ENABLED. Follow docs/acceptance.md for real challenge, staff, phone/network and timing checks. Proposed tolerance p95 <=50 ms remains unapproved.
3. Complete nonproduction recovery rehearsal without exposing data and prepare verified production D1/Pages/cleanup/rollback/QR.
4. Enable production only after physical acceptance, remaining policy decisions and owner authorization. No production deployment or real-prize launch was done here.

Act autonomously on routine reversible work, preserve unrelated changes, avoid repeated confirmations, and do not spawn subagents unless explicitly requested. Use actual working-tree evidence over stale reports.
