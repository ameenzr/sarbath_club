# Operations and release runbook

Status: local implementation verified; isolated remote preview deployed. Real secrets, owner decisions, and launch verification pending. Commands checked against Wrangler 4.134.0 on 18 September 2026. Do not deploy the dummy database ID in the current local configuration.

## Configuration inventory

| Setting | Location | Meaning |
|---|---|---|
| VITE_TURNSTILE_SITE_KEY | Build environment | Public site key; real registered site key for remote builds |
| TURNSTILE_SECRET | Pages secret | Private verification key; interactive entry only |
| STAFF_PASSWORD | Pages secret | Private staff login credential; interactive entry only |
| GAME_ENABLED | Pages environment | Must remain false until launch gates pass |
| APP_ENV | Environment | Environment label; never used alone to bypass security |
| DB | D1 binding | Exact isolated local/preview/production database |
| config record | D1 | Prize, terms, threshold, validity, 30-day retention, approval and version |

The local public test secret and demo password cannot enable remote verification/login. Browser code contains only the public site key. Never prefix private credentials with VITE_. `approved=1` must represent an actual owner-approved policy; do not set it just to bypass launch checks.

## Remote setup, after H-03

1. Human runs `npx wrangler login`, completes browser login/MFA, and confirms the intended account. Agent reads account state using `npx wrangler whoami` without requesting credential values.
2. Agent checks whether the proposed preview names are free. Create an isolated preview Pages project and D1 database; record actual account, names and returned IDs. No production resource is reused for preview tests.
3. Replace dummy IDs in a separately prepared target configuration. Confirm migrations and environment binding. Apply remote migrations only to the verified target.
4. Human configures Turnstile for the preview hostname and enters verification/staff secrets through provider tooling. Agent supplies commands with the actual Pages project name. Use `npx wrangler pages secret put TURNSTILE_SECRET --project-name <resolved-name>` and the equivalent STAFF_PASSWORD command as templates; the agent must resolve the name before handing commands to the owner. Values are entered at the interactive prompt, never in chat or CLI arguments.
5. Build with the actual public site key and deploy to that named Pages project. Agent verifies preview URL, runtime binding, staff authentication and verification using synthetic data.

This document's angle-bracket names are explanatory templates, not ready-to-run human instructions. Actual commands belong in the checkpoint notice only after the target is resolved.

The preview target is now resolved: `sarbath-club-preview` at https://sarbath-club-preview.pages.dev/ with `sarbath-club-preview-db`. Migrations applied with `npx wrangler d1 migrations apply DB --remote --config wrangler.preview.toml`. Deploy updates using `npm run deploy:preview`; Pages itself accepts only root wrangler.toml, so the script stages the preview file and restores local configuration afterward. Database CLI operations do accept the custom config path. Keep any local server stopped while deploying to avoid transient config reloads.

H-04 secret entry commands for this exact preview target:

```powershell
npx wrangler pages secret put TURNSTILE_SECRET --project-name sarbath-club-preview
npx wrangler pages secret put STAFF_PASSWORD --project-name sarbath-club-preview
```

Create a managed Turnstile widget allowing `sarbath-club-preview.pages.dev`. Enter its secret at the first command's interactive prompt. Choose a new staff password at the second prompt. Return only the public site key and confirmation of completion to the agent, which will configure the build and redeploy. Do not reuse local demo credentials.

## Prize and policy changes

Record the owner-approved label, terms, coupon validity and retention in `docs/decisions.md`. Confirmed policy is one free sarbath, valid seven days from winning, and automatic 30-day retention without a customer deletion feature. Update the `config` record through parameterized administrative queries or verified dashboard SQL, increasing `version`. Every attempt copies the prize and thresholds, so later changes leave issued coupons unchanged.

Defaults seeded by migrations are explicitly local demo values. Production must replace them before approval/enablement. Threshold changes require revisiting timing acceptance when material. Keep coupons valid according to their original saved terms.

## Staff password rotation

Use Pages **Settings → Variables and Secrets** for the confirmed project, or the interactive `wrangler pages secret put STAFF_PASSWORD` command with its resolved project name. Deploy or redeploy as needed for the provider's current secret rollout behavior and verify the new password. Old staff sessions become invalid because the session's password-version digest no longer matches. Share the new password through your normal secure staff channel; the agent does not message staff.

## Export and recovery

The local command below is safe for synthetic development records:

```powershell
npx wrangler d1 export DB --local --output ./tmp-local-backup.sql
```

It creates a sensitive SQL backup if real records ever exist locally. Store it outside public assets and version control; `.gitignore` excludes backup files. For remote exports, the agent must supply a resolved target configuration and `--remote` only after verifying the intended database. Keep exports access-controlled and apply the approved retention policy to them as well.

[D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) currently provides up to 7 days of recovery on Workers Free and 30 days on Paid. Exports offer a separate retained snapshot. Do not claim that the free plan has no recovery capability.

For an incident, disable new play, record the current deployment and database bookmark, export the current state if possible, and prepare a reviewed recovery plan. Restoring data may undo redemption records; prevent staff from issuing prizes until records are reconciled. Time Travel restore is a destructive production operation requiring explicit authorization. Restore procedures and rollback must be practiced on isolated nonproduction data before launch; that remote rehearsal remains pending.

## Automatic retention

Cleanup expires abandoned attempts, removes old sampling/rate-limit/staff-session records, deletes attempt records beyond retention only after coupon expiry and the play date has passed, and removes old result credentials after 24 hours. Coupon records remain searchable by authorized staff after their session credential expires.

Pages Functions have no scheduled handler here. The separate `worker/cleanup.js` is deployed as `sarbath-club-preview-cleanup` with `wrangler.cleanup.preview.toml`, bound to the isolated preview D1 database and an hourly Cron Trigger. Its public HTTP endpoint is disabled. It runs only for an approved policy. Request-time maintenance is throttled to once a minute during ping as a fallback. Before production release, provision the corresponding production schedule and verify its execution; no production cleanup worker exists yet.

Customer records are retained for 30 days from play, then removed on the next regular cleanup cycle. There is no customer deletion-request section or endpoint. Owner administrative maintenance remains separate from customer access. Apply the same retention policy to owner exports and incident copies; never store them in public assets.

CSV export consumers must use `csvCell` escaping from `server/core.js`; SQL backups are for database recovery, not direct spreadsheet opening. Do not change stored names to address spreadsheet formula injection.

## Usage and costs

Planning volume is 200 plays/day. Each new page/config load adds a request; three samples use six requests, followed by Start and Tap. About 9 API requests per new play means roughly 1800/day before staff operations/recovery. Database writes include sample issue/ack, rate counters, reservation/finalization and indexes/cleanup; measure rows with D1 metadata/dashboard instead of equating one API call to one row.

[Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/) currently include 100,000 requests/day. [D1 Free allowances](https://developers.cloudflare.com/d1/platform/pricing/) include 5 million reads/day, 100,000 writes/day and 5 GB total storage. Limits are account-wide; other applications count too. Check dashboard metrics and CPU usage after preview. Warn on meaningful trends toward limits; do not promise indefinite zero cost or enable a paid plan without authorization.

## Release checklist

- Local tests/build pass and remote tests use the intended database.
- Real Turnstile hostname/action verification and staff session behavior pass.
- Prize and privacy decisions recorded; config approved with no demo values.
- Real device/shop-network timing acceptance and staff walkthrough pass.
- Retention scheduler deployed, tested and recovery rehearsal completed.
- Production migration/deployment targets and rollback package reviewed; necessary authorization recorded.
- Stable production URL recorded. Generate QR using `npm run qr -- <resolved-https-url>`, rebuild if the QR is served publicly, and scan the printed copy.
- Enable GAME_ENABLED only after all gates pass. Document live URL and smoke-test evidence.

There is no production URL or valid production QR yet. The agent must not substitute a guessed Pages address.
