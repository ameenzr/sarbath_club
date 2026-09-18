# Verification report

18 September 2026. Environment: Windows, Node 24.15.0, React 19.3, Vite 7.3.6, Wrangler 4.134.0, Chromium via Playwright 1.63. Synthetic local data; isolated remote preview deployed with customer play disabled.

## Results

| Check | Result | Scope |
|---|---|---|
| npm run build | Pass | Production client bundle and static assets |
| npm run check | Pass | TypeScript parser/module check for JS/JSX; not full strict JS type checking |
| Local D1 migrations | Pass | Initial schema and maintenance indexes/table applied |
| npm test | 4 suites pass | Pure boundaries; real D1 concurrency/rollback/cleanup; API authentication/verification/origin/privacy |
| npm run test:e2e | 5 tests pass | Mobile/desktop UI, themes, fixtures, local live flow and initial timing comparison |
| Dependency audit | 0 vulnerabilities | Stable Miniflare with patched undici/sharp overrides |
| Bundle secret scan | Pass | No staff password, private Turnstile secret or demo password in src/public/dist |
| Visual review | Pass | Mobile light/dark, desktop and winning coupon screenshots inspected |
| Cloudflare access | Pass | User completed login; sole account verified |
| Remote preview smoke | Pass | Homepage/staff/config 200; Start game_unavailable; D1 attempt count zero |
| Real site-key deployment | Pass | Public site key found in deployed bundle; real Turnstile frame loads |
| Real challenge completion | Pending | Automated headless browser did not obtain a verification token; human browser acceptance needed |
| 30-day retention | Pass | Recent record retained; record older than 30 days removed; remote config reports 30 days |
| Preview cleanup deployment | Pass | Hourly Cron Trigger configured on isolated preview D1; no production worker deployed |
| Physical/production checks | Pending | Not represented by automated browser or mock passes |

The three initial dependency findings were addressed by compatible patched transitive dependencies. The runtime compatibility date is 2026-08-06 to match the stable test runtime; both app and scheduler use it. An initial timing-test observer missed React's class changes; it now observes attributes and text changes, and the rerun passed. These were verification fixes, not relaxed acceptance criteria.

## PRD acceptance mapping

| PRD criterion | Evidence | Remaining |
|---|---|---|
| 1 — Thresholds | 119/120/449/450 classifier tests; real session timing and browser outcomes | Supported physical phones and near-boundary measurement |
| 2 — Start races | Concurrent D1 reservations yield one daily attempt | Remote smoke/concurrency check |
| 3 — Local midnight | UTC 18:29:59/18:30:00 conversion test | None locally |
| 4 — Consumption policy | Early/expired attempts consume; failed verification/high latency create no attempt | Device abandonment walkthrough |
| 5 — Duplicate taps | Concurrent finalization returns one saved result/code | Remote retry check |
| 6 — Collisions/failures | Code collision retry, exhausted retry rollback and injected session-update failure | None locally |
| 7 — Staff lookup | API code lookup; phone query implementation; staff fixture rendering | Staff on-phone exercise |
| 8 — Double redemption | Conditional D1 update race and repeat API request | Staff uncertain-response exercise |
| 9 — Access control | Unauthenticated, cross-origin, logout, rotated-password and expired-session checks | Real remote cookie/secret configuration |
| 10 — Secrets/verification | Bundle scan; invalid-token rejection; official testing-key live validation | Real-site hostname/action verification and remote limits |
| 11 — Recovery | Start bearer retry, saved-result replay, refresh recovery | Physical network-loss walkthrough |
| 12 — Accessibility/timing | Narrow-screen overflow check, keyboard tap, reduced-motion/theme screens, contrast-oriented palette | Physical timing acceptance, sunlight/readability review |

Initial scripted local timing comparison: five approximately 300 ms trials produced rounded server-minus-browser differences +9/+7/+6/+10/+8 ms. These are small-sample software measurements, not proof of physical timing accuracy. See `timing-validation.md`.

Local browser runs leave synthetic attempt/coupon records in local D1; no real customer data was collected. Fixture-only codes do not exist in persistent storage. Tests use isolated in-memory D1 for unit/integration suites. Browser evidence is generated under ignored `test-results/`.

## Launch blockers

H-05/H-06 real-device timing/staff/QR acceptance and production authorization when needed. H-01/H-02 reward/privacy policy, H-03 account access and H-04 key/secret configuration are resolved. Successful remote Turnstile validation and staff login still need acceptance checks; encrypted entries alone do not establish correct values. Remote backup/restore rehearsal and production retention-scheduler deployment are outstanding; the preview scheduler has been deployed.
