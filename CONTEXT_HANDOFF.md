# Sarbath Club — context handoff

Updated 20 September 2026. Project summary, not a chat export. No private secrets.

## Latest external changes & status

The owner pushed 4 new commits onto `main` (ahead of `origin/main` by 4 commits):
1. `a30dc61` - **Refine game and staff flows for live release**:
   - Migration `0007_release_redeemed_coupons.sql`: Redeeming a coupon releases the phone lock so the customer can win and claim again immediately.
   - Core & API: `redeem()` in `server/core.js` now deletes the phone entry in `coupon_locks` atomically during coupon redemption.
   - Remote migrations 0001–0007 applied to preview D1 (`sarbath-club-preview-db`).
   - WebP logo asset: Added `public/logo-backgroundless.webp` (transparent 512px, 216 KB) for fast mobile rendering.
   - Connection spike tolerance: Up to 9 ping samples collected in `src/api.js` to find 3 stable samples within median <= 1000 ms, spread <= 150 ms.
   - Full test coverage expanded: 13/13 Node unit/integration tests and 6/6 browser tests passing.
   - Preview enabled with `GAME_ENABLED=true` on https://sarbath-club-preview.pages.dev/ for live owner testing.
2. `1c8830a` - **Add replay action to claim dialog**: Allows players who won to replay directly from the claim dialog.
3. `a1cf288` - **Redesign staff coupon dashboard**: Enhanced counter interface with search, quick filters, clear status badges, and streamlined redemption.
4. `2f0796b` - **Redesign winning coupon as visual ticket**: Branded ticket card layout with coupon code, barcode/ticket aesthetics, copy-to-clipboard button, and store location navigation link.

## Launch Animation Status
- Refined mobile-first launch animation in `src/App.jsx` and `src/style.css`.
- Realistic dual-layer SVG fluid waves (Gold `#FCC845` back layer, Sarbath `#954103` front layer) with smooth counter-sliding animations and specular crest highlights.
- Gentle effervescent bubbles rising inside the liquid layer.
- Splashes and droplets removed per user preference for a clean, elegant aesthetic.
- Zero full-screen color bleeding or filter distortion; fully optimized for mobile screens.
- All 13 unit tests and 6 browser e2e tests passing cleanly.

Working tree is clean; build, type checks, and all 13 unit tests pass.

## Workspace and repository

- Windows PowerShell: `C:\Users\Ameen\projects\sarbath_club`
- GitHub: https://github.com/ameenzr/sarbath_club
- Branch: `main` (ahead of `origin/main` by 4 commits: `a30dc61`, `1c8830a`, `a1cf288`, `2f0796b`).
- React/Vite frontend, Cloudflare Pages Functions API, D1 SQLite database, and separate hourly cleanup Worker.
- Key files:
  - `src/App.jsx`: Complete mobile-first UI with anonymous play, visual ticket coupon, staff dashboard, and privacy policy.
  - `src/api.js`: API client with connection sample retry logic and error handling.
  - `server/core.js`: Game timing, anonymous `reserve`, `finalize`, verified `claim`, `redeem` with lock release, cleanup, rate limits.
  - `functions/api/[[path]].js`: Cloudflare Pages Functions API handlers.
  - `migrations/`: 0001–0007 migrations (includes 0005 play-then-claim, 0006 issuance terms, 0007 lock release upon redemption).
  - `worker/cleanup.js`: Hourly data retention cleanup worker (`sarbath-club-preview-cleanup`).
- Branding: Blue `#1E5FAF`, Cream `#F4E7D3`, Brown `#8B4A1F`, Gold `#E6B85C`. Logo: `public/logo-backgroundless.webp`.

## Confirmed game & reward rules

1. **Anonymous play**: Anyone can tap "LET'S PLAY" immediately without entering personal details or completing captcha.
2. **Reaction criteria**: 120–449 ms reaction earns a prize. Below 120 ms, tapping before flash, 450 ms or slower, and expiry do not win.
3. **Unlimited retries**: Customers can replay immediately as many times as they want.
4. **Verified claim**: Only upon winning, the player enters name and mobile number, completes Turnstile verification, and claims the coupon.
5. **Reward**: One free **sarbath**.
6. **Coupon validity**: Exactly 7 days (604,800,000 ms) from issuance timestamp.
7. **One active coupon per phone**: A phone number cannot claim another coupon while holding an active, unredeemed coupon (`active_coupon` 409).
8. **Redemption releases lock**: When staff marks a coupon as redeemed, the phone lock is released immediately (migration 0007), allowing the customer to win and claim again.
9. **Data retention**: Customer details are retained for 30 days from issuance, cleaned automatically by the hourly retention worker.

## Cloudflare infrastructure

- Account ID: `2bbb5d7a6d1b537e5e61c8138c5275a6`
- Pages project: `sarbath-club-preview` (https://sarbath-club-preview.pages.dev/)
- Preview D1: `sarbath-club-preview-db` (`cc5eaccb-b5eb-42c6-973b-a16b2cf5fdce`, APAC)
- Deployed migrations: 0001–0007
- Preview cleanup worker: `sarbath-club-preview-cleanup` (hourly cron `0 * * * *`)
- Turnstile: Public site key `0x4AAAAAAE7jL3Poyh4vtvKG` (managed, hostname `sarbath-club-preview.pages.dev`)
- Preview secrets: `TURNSTILE_SECRET` and `STAFF_PASSWORD` configured securely in Cloudflare Pages.

## Verification commands

```powershell
npm run check          # TypeScript syntax and module check
npm test               # 13 Node unit and integration tests (all pass)
npm run build          # Vite production build (245.8 kB JS, 27.9 kB CSS)
npm run db:local       # Local D1 migration runner
npm run test:e2e       # Playwright browser test suite (6 tests)
npm run deploy:preview # Deploy production build to sarbath-club-preview
```

## Next steps / pending actions

1. **Git sync**: Push local commits `a30dc61..2f0796b` to `origin/main` on GitHub (`git push`).
2. **Preview redeploy**: Deploy the newest ticket redesign & staff dashboard changes to preview via `npm run deploy:preview` if not already deployed.
3. **Physical testing & launch acceptance**: Real device touch timing, staff counter rehearsal, and printed QR verification before final production launch.
