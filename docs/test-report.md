# Verification report

Updated 19 September 2026. Local synthetic data and disabled Cloudflare preview.

## Current checks

- Production build passes (240.56 kB JS, 8.16 kB CSS). Parser/module check passes; this is not strict JS type checking.
- All 11 Node tests pass (47.8 seconds, final run including migration 0006). Coverage includes exact thresholds, anonymous starts, idempotent finalization/claims, simultaneous normalized-phone claims, redeemed-but-unexpired blocking, exact-expiry eligibility, collision retries, injected lock-write rollback, populated legacy migration, customer/lock/session retention, staff authentication and origin checks.
- Lifecycle redemption deliberately uses coupon IDs differing from play IDs.
- Local and preview migrations 0001–0006 are applied, including corrected future terms from claim issuance.
- All five browser tests pass (51.2 seconds). The live test now submits a winning claim to the real local Pages Function, which calls official test-key Siteverify; widget acquisition is replaced. This does not establish real-site verification.
- Remote preview had zero legacy attempts/sessions before additive migration 0005. It is now applied; migration 0006 also passed.
- Pre-migration preview Time Travel bookmark: 00000019-00000000-000050ea-993ddbed630c76b79c44d008631534a7. No SQL data export was performed. A restore requires explicit authorization and is not part of this update.

## Evidence limits

Earlier five-browser-test passes and timing trials are historical evidence. The old report's daily-attempt acceptance mapping is superseded by PRD version 1.1. Current tests do not establish physical timing, sunlight readability, actual staff password correctness, real hostname/action challenge completion, account-wide cost limits, or a remote restore rehearsal.

The approximate timing model can be manipulated by delaying connection samples. Physical acceptance and owner abuse-risk/tolerance decisions remain required before real-prize launch. Test records are synthetic; screenshots/timing output are under ignored test-results/.

## Release status

Preview remains GAME_ENABLED=false. Pages deployed at https://ae06d082.sarbath-club-preview.pages.dev/ and its separate hourly cleanup worker was redeployed (version cd3ba866-debf-4f36-a4cc-0e5e73943da9, hourly cron). Homepage/staff/privacy/config smoke tests returned 200; config enabled=false, retention=30; anonymous start returned 503 game_unavailable. Scheduler execution is not yet independently observed. Production has not been provisioned/enabled by this update. Real phone/shop-network measurements, real verification/staff walkthrough, printed QR and backup/restore acceptance remain human launch gates.
