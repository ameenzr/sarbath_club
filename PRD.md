# Product Requirements Document
## Sarbath Club — Reaction Tap Game

Version 1.1. Updated 18 September 2026. Implementation available; physical acceptance and production launch pending.

## Customer journey

1. Open the kiosk or QR destination and start anonymously. No name, phone, account or verification is required to play.
2. Wait for the blue screen, then tap once. A tap before the flash or an estimated reaction below 120 ms is too early. 120–449 ms wins; 450 ms or slower loses. The server expires an abandoned play.
3. Failed plays allow immediate retries. Plays have no daily business limit. Abuse rate limits may temporarily throttle requests.
4. After a win, enter a name and Indian mobile number, complete Turnstile verification, and claim a coupon. Verification is bot protection, not SMS verification or proof of phone ownership.
5. A successful claim displays a unique code, one free sarbath, saved terms, and an exact expiry seven days from claim issuance.
6. Each normalized phone may claim only one coupon within its validity period. Redemption does not shorten this period. At expiry, a new winning claim is allowed.
7. Show the code to staff at the counter. A previously claimed code remains visible in the tab when starting another play.

No purchase is required to play. No payment, customer accounts, SMS OTP, leaderboard, marketing analytics or multi-shop operation is included.

## Game timing and recovery

The server owns the random 1500–4500 ms wait and computes an estimated reaction from tap receipt minus issue time, waiting delay and server-observed connection baseline. Three recent cookie-bound challenge/ack durations establish the median; reject median above 1000 ms or spread above 150 ms before creating a play. An intentionally delayed client can manipulate samples; this method does not prove human reaction or exact render timing.

Play expiry is issue time plus wait, baseline and 10000 ms. Thresholds and prize settings are snapshotted per play. The frontend locks the first pointer/keyboard activation immediately. Conditional server writes persist one result despite repeated taps.

The browser creates an opaque UUID and sends it only as a bearer header; storage contains the credential for tab recovery and the server stores its digest. A lost start response retries the same credential. Refreshing a pending play recovers it without restarting its visual timer. A winning proof recovers the claim form; a claimed proof recovers its existing coupon. Claim retries must not generate another coupon or require reusing a consumed verification token. Starting a new play uses a fresh UUID.

## Claim integrity

Only a stored winning play can claim. Validate name (1–80 trimmed characters) and normalize Indian mobiles to +91. Verify Turnstile server-side against the secret, expected remote hostname and action. Local tests use official test credentials; those credentials cannot enable remote verification.

Coupon insertion and phone-lock update form one D1 batch. A play has at most one coupon; a phone lock prevents claims while its expiry is greater than the claim time. Unique code collisions roll back and retry at most five times. An existing winning proof with a coupon returns that coupon idempotently.

Codes use JB- plus five characters from the unambiguous alphabet. No phone-only customer endpoint exposes codes. An active-coupon rejection does not reveal another customer's identity or code. Legacy issued coupons remain valid under their original snapshots; migration does not revoke them.

## Staff flow and security

Staff sign in with the configured private password. An HttpOnly, SameSite=Strict cookie (Secure over HTTPS) authorizes code/phone search and redemption. Sessions expire after eight hours; logout revokes access and password rotation invalidates older sessions.

Search returns at most ten coupons, with identity, prize, estimated reaction, expiry and redemption state. Redeem the coupon ID returned by search, which may differ from its play ID. Conditional updates allow exactly one successful redemption of an unexpired, unredeemed coupon. Repeated requests reveal the recorded state. Staff must confirm redemption before handing over a prize, and search again after an uncertain response.

API POST requests use bounded JSON and require matching remote Origin. Secrets stay server-side and out of source, browser bundles, logs and chat. Inputs, credentials and personal details must not be logged. Rate limits protect starts, sampling, claims and staff operations.

## Data and retention

Migration 0005 separates plays, play_sessions, coupons and coupon_locks, copying legacy attempts and sessions. Configuration, sampling, rate counters, staff sessions and maintenance records support operation.

Anonymous timing records contain no name or phone. Identity is collected only at coupon claim and retained for 30 days from issuance, then removed automatically on the next cleanup cycle once the coupon has expired. Removing coupons cascades their locks. Anonymous plays older than 30 days are removed if no retained coupon references them; sessions cascade with their plays. Legacy records also receive cleanup.

Authorized staff may search coupon records. Cloudflare hosts the application, database and verification. No customer deletion-request interface or marketing use is included. Owner exports/backups are access-controlled, ignored by Git and subject to the same retention policy.

An hourly cleanup Worker runs separately from Pages. Schema updates precede both runtime deployments; changes to shared core cleanup require redeploying the Worker as well as Pages.

## Interface requirements

Use Sarbath Club branding, clear labels, visible focus, large touch targets and no scrolling during the wait/tap screen. Explain the flash through text and color. Avoid strobing, respect reduced motion, and support readable mobile/desktop light/dark layouts. Present timing as estimated.

Owner-requested mobile design: minimal single-column screens, short headings and instructions, system fonts without external font requests, 16 px inputs, primary controls at least 48 px high, safe-area support and no horizontal overflow down to 320 px. The welcome action should be visible without scrolling on common phone heights. Allow natural scrolling for claim forms and privacy content; never clip verification.

Required states: welcome, connection checking, waiting, flash, submitting, unclaimed win, claiming, coupon result, failure with replay, active-coupon rejection, interruption and recovery. Explain both kinds of too-early result. Active-coupon text must say claim eligibility resumes at expiry.

## Acceptance criteria

1. Exact classifier boundaries: 119 too early, 120 and 449 win, 450 loses.
2. Anonymous starts require no identity or verification; repeated credentials return the same play and distinct new credentials allow unlimited plays.
3. Duplicate taps preserve one outcome. Pending recovery cannot replay its timer.
4. Only winning proofs can claim; invalid verification issues no coupon and preserves the win.
5. Concurrent claims for one normalized phone issue only one coupon; retries for one proof recover that coupon.
6. Redeemed-but-unexpired coupons block new claims; exact expiry permits a new claim. Validity is seven days from issuance.
7. Code collisions and injected batch failures leave no partial coupon/lock and preserve the result.
8. Populated legacy migration preserves codes, recovery, phone locks and redemption.
9. Staff search uses coupon IDs; simultaneous redemption changes state once. Unauthorized, expired, logged-out and rotated-password sessions cannot access records.
10. Thirty-day cleanup removes expired identity and locks while preserving recent or unexpired coupons.
11. Mobile/keyboard/claim/replay/recovery UI passes appropriate tests. A real local Worker claim uses official test verification; fixtures alone do not establish it.
12. Before real-prize launch, actual phones/shop networks pass owner-agreed timing tolerance, real hostname verification, staff redemption, recovery, QR and backup/restore acceptance.

## Release gates

The isolated preview remains GAME_ENABLED=false. Local tests cannot substitute for physical measurements or correct private credentials. Prepare an explicitly authorized nonproduction acceptance session to test real claim and staff use. Record supported devices, owner timing-error tolerance and abuse-risk acceptance.

Production needs its own verified D1/Pages target, retention schedule, backup/rollback procedure, stable URL/printed QR and staff walkthrough. Enable customer play only after acceptance and owner authorization. No production URL or successful physical acceptance is currently established.
