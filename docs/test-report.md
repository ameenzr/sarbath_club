# Verification report

Updated 20 September 2026.

## Current release

- Stable Pages URL: `https://sarbath-club-preview.pages.dev/`
- Deployment URL: `https://a8621354.sarbath-club-preview.pages.dev/`
- Remote D1 target: `sarbath-club-preview-db`
- Remote migrations: 0001–0007 applied; Wrangler reports no pending migrations.
- Cleanup Worker: `sarbath-club-preview-cleanup`, version `4a5ca3f5-0276-42d1-80f8-3d01b891beea`, hourly schedule.
- Runtime configuration smoke test: prize is one free sarbath, retention is 30 days, and customer play is enabled.

## Automated checks

- `npm run build`: passed. Final client output is 244.75 kB JavaScript and 23.31 kB CSS before gzip.
- `npm run check`: passed.
- `npm test`: 13/13 Node tests passed. Coverage includes timing thresholds, anonymous play, recovery, claims, duplicate-phone locking, immediate eligibility after redemption, expiry, collision retries, rollback behavior, migrations, cleanup, staff authentication, and origin checks.
- `npm run test:e2e`: 6/6 browser tests passed. Coverage includes 320–768 px layouts, customer/staff/privacy screens, all game outcomes, real local Worker/D1 claim and recovery, copy-code feedback, store-location link, and reduced motion.
- `npm audit --omit=dev`: zero production dependency vulnerabilities.
- Final scripted 300 ms timing comparison errors were +13, +22, +9, +12, and +8 ms in local Chromium. These are software checks, not physical display measurements.
- Live smoke tests returned 200 for `/`, `/staff`, `/privacy`, `/api/config`, and `/logo-backgroundless.webp`.

The launch logo is delivered as a 512 px transparent WebP at 216 KB, reduced from the 1.37 MB source PNG while preserving the supplied artwork.

## Remaining real-world checks

Automated checks do not establish physical timing accuracy, sunlight readability, mobile-network behavior, printed-QR scanning, or staff proficiency. The reaction estimate remains vulnerable to client automation and manipulated connection samples. Complete physical phone/shop-network and staff acceptance before treating the game as abuse-resistant for high-value prizes.
