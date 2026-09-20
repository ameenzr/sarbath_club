# Sarbath Club — context handoff

Updated 20 September 2026 after reviewing the owner’s external changes. This is a project handoff, not a chat export. It contains no private secret values.

## Current repository state

- Workspace: `C:\Users\Ameen\projects\sarbath_club`
- GitHub: https://github.com/ameenzr/sarbath_club
- Branch: `main`, clean and synchronized with `origin/main`.
- Runtime: React/Vite frontend, Cloudflare Pages Functions API, Cloudflare D1, and a separate hourly cleanup Worker.

## Product rules

1. Customers select **Tap Fast. Sip Free.** and play anonymously.
2. A server-estimated 120–449 ms reaction wins. Under 120 ms, taps before the blue screen, 450 ms or slower, and expiry do not win.
3. Failed plays can be replayed immediately, with normal API abuse limits still applied.
4. Only a winning play presents name/mobile fields and Turnstile verification to claim a coupon.
5. Prize: one free sarbath.
6. Each coupon expires exactly seven days after issuance.
7. A phone can hold one unredeemed coupon. When staff redeems it, its phone lock is removed immediately, allowing that number to win and claim again. Unredeemed coupons continue blocking a claim until expiry.
8. Customer identity and coupon records are retained for 30 days from issuance. The scheduled Worker performs cleanup. There is no customer deletion-request UI.

## External changes now present

Latest game-page redesign: the Tap Fast. Sip Free. detail page now follows the owner-supplied dark mobile mockup. It uses a dedicated dark canvas, two-line title, explanatory copy, compact 120–449 ms/unlimited-play row, illustrated free-sarbath reward card, full-width blue Start button, and dark saved-coupon/recovery/result states. The former behavior and game rules are unchanged. The reference image contained the retired “Quick Sip Challenge” label; implementation correctly uses “REACTION GAME” and the current game name instead.

Latest claimed-coupon redesign: after a successful claim, the game introduction is replaced by a focused mobile result. It uses a cream scalloped ticket, a copyable coupon code, counter and seven-day-expiry details, a blue **Get directions** action, and an outlined **Play again** action. It follows the supplied Sarbath Club palette and retains the existing coupon, clipboard, map, and replay behavior.

The owner’s recent commits are already pushed and merged:

- `a30dc61`: release-flow changes. Adds migration `0007_release_redeemed_coupons.sql`, which removes locks for redeemed coupons. `redeem()` updates coupon state and lock deletion together. Adds a transparent 512 px WebP logo and expands verification.
- `1c8830a`: adds replay from the claim view.
- `a1cf288`: redesigns the staff counter with filters, status badges and a streamlined redemption view.
- `2f0796b`: turns the winning coupon into a branded ticket with code copy feedback and a store-location link.
- `65b4e55`: adds favicon/Apple touch-icon assets and refines the mobile liquid-wave launch animation.

The customer home screen is now a game-selection screen rather than the earlier single-card welcome view. It has an information dialog for **Tap Fast. Sip Free.**, animated decorative waves and a mobile-first layout. The app includes a copy-code fallback for browsers without `navigator.clipboard`.

## Key files

- `src/App.jsx`: customer game selection/play/claim/ticket screens, staff UI, privacy view, launch animation.
- `src/style.css`: responsive mobile layout, game hub, ticket, staff dashboard, rules dialog and reduced-motion styling.
- `src/api.js`: API client and up-to-nine-sample connection stability check.
- `server/core.js`: anonymous reserve/finalize, coupon claim, redemption with lock release, cleanup and rate limits.
- `functions/api/[[path]].js`: Pages API routes.
- `migrations/0001–0007`: schema history; `0007` releases redeemed coupon locks.
- `worker/cleanup.js`: hourly retention cleanup.
- `public/logo-backgroundless.webp`: transparent logo for the application.
- `public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon.png`, `apple-touch-icon.png`: current icon suite.
- `docs/acceptance.md`: physical acceptance walkthrough.

## Cloudflare preview

- Pages project: `sarbath-club-preview`
- Stable URL: https://sarbath-club-preview.pages.dev/
- Preview D1: `sarbath-club-preview-db` / `cc5eaccb-b5eb-42c6-973b-a16b2cf5fdce` (APAC)
- Config: `APP_ENV=preview`, `GAME_ENABLED=true`
- Remote schema: migrations `0001–0007` are recorded as applied; no pending migrations per the current test report.
- Cleanup Worker: `sarbath-club-preview-cleanup`, hourly cron `0 * * * *`; current recorded version `4a5ca3f5-0276-42d1-80f8-3d01b891beea`.
- Turnstile public site key: `0x4AAAAAAE7jL3Poyh4vtvKG`. Widget hostname is `sarbath-club-preview.pages.dev`.
- Private `TURNSTILE_SECRET` and `STAFF_PASSWORD` are configured in Pages. Never read, print, put in commands, or commit their values.

`scripts/deploy-preview.js` temporarily stages `wrangler.preview.toml` as root config because Pages deployment uses root `wrangler.toml`, then restores the local config. It deploys to the named preview project. Do not change its project name unless a new Pages project has actually been created.

## Reported verification

The latest local verification after the game and claimed-coupon redesign records:

- `npm run build`: pass; 249.11 kB JS and 34.12 kB CSS before gzip.
- `npm run check`: pass.
- `npm test`: all six top-level Node test suites pass.
- `npm run test:e2e`: 6/6 browser tests pass.
- `npm audit --omit=dev`: no production dependency vulnerabilities.
- Preview smoke tests: `/`, `/staff`, `/privacy`, `/api/config`, and the WebP logo returned 200; customer play was enabled.

Treat these as prior recorded evidence unless rerun after new changes.

## Remaining launch work

- Physical phone/shop-network timing measurements, including near 120/450 ms boundaries.
- Real Turnstile completion and actual staff-login/redemption walkthrough.
- Printed QR scan and sunlight/readability review.
- Production Pages/D1/cleanup environment, recovery rehearsal, and owner authorization for a real-prize launch.

Some older narrative passages in `docs/decisions.md` and `docs/operations.md` retain historical statements that conflict with the current enabled-preview and redemption-unlocks-phone rules. Use this handoff, `README.md`, `TASKS.md`, the current code, and the latest `docs/test-report.md` as the current source while cleaning up documentation in a future change.

## Commands

```powershell
npm run check
npm test
npm run build
npm run db:local
npm run preview
npm run test:e2e
npm run deploy:preview
```

Run `npm run build` before preview/deploy. Keep local test servers stopped while deploying so the temporary configuration staging cannot make them reload.
