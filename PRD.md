# Product Requirements Document
## Juice Bar Kiosk — Reaction Tap Game

**Version:** 1.0  
**Status:** Draft — pending launch decisions and timing validation  
**Updated:** 18 September 2026  
**Product:** Sarbath Club

**Confirmed reward:** One free sarbath. Each winning coupon is valid for seven days from issuance; staff must redeem it before its expiry timestamp. **Confirmed retention:** Customer records are retained for 30 days and removed automatically; no customer deletion-request interface is included.

## 1. Overview

A mobile-first web game that customers open from a juice bar kiosk or a QR code. Customers enter their name and phone number, wait for a color change, and tap as quickly as possible. A qualifying result earns a coupon that staff validate and redeem at the counter.

No app download, customer account, or payment is required. Version 1 supports one shop and one prize configuration.

## 2. Goals and Success Measures

| Goal | Measurement |
|---|---|
| Encourage customer engagement at the counter | Daily started and completed attempts |
| Offer a simple reaction-based reward | Completion rate, result distribution, and win rate |
| Keep redemption easy for staff | Time from search to confirmed redemption; target under 30 seconds |
| Prevent duplicate plays and redemption | Zero duplicate daily attempts or successful double redemptions in concurrency tests |
| Keep operating costs low | Usage remains within verified provider allowances at an initial planning volume of 200 plays/day |

An analytics dashboard is excluded from v1. Aggregate measures may be obtained through owner exports without adding third-party tracking.

## 3. Users

| Role | Responsibilities |
|---|---|
| Customer | Enter details, play once per day, and present a winning code |
| Staff | Sign in, search for a coupon, confirm validity, and redeem it during handover |
| Owner | Configure the prize, manage credentials, review usage, and export operational data |

## 4. Scope

**Included:** customer registration form, daily eligibility checks, reaction game, coupon issuance, staff authentication, coupon search and redemption, bot protection, rate limits, accessible mobile UI, privacy notice, and launch documentation.

**Excluded:** SMS verification, payments, customer accounts, leaderboards, social sharing, push notifications, multiple locations, an analytics dashboard, and an owner configuration UI.

Phone numbers are self-reported. The daily limit applies to a normalized phone number; without OTP, the system cannot establish ownership or guarantee one play per person.

## 5. Customer Journey

1. Customer opens the game URL from a kiosk or QR code.
2. Customer enters a name and phone number and sees the privacy notice.
3. The application completes bot verification and connection checks.
4. Customer taps **Start**. The server atomically reserves today's attempt before returning a game session.
5. The screen displays **Get ready…** for a random delay between 1.5 and 4.5 seconds. Do not display a countdown that reveals the exact change time.
6. A static, high-contrast target appears with the instruction **Tap now**.
7. The first tap submits the session. Further taps are disabled immediately.
8. The server finalizes the result and returns one of the outcomes below.

| Outcome | Default rule | Customer experience |
|---|---|---|
| Win | Adjusted time ≥120 ms and <450 ms | Show time, prize description, coupon code, validity terms, and **Show this code to staff** |
| Loss | Adjusted time ≥450 ms within the session window | Show time and **Come back tomorrow** |
| Too early / suspiciously fast | Tap during waiting, or adjusted time <120 ms | Explain that the attempt is used and invite a return tomorrow |
| Expired | Session is not completed within its allowed window | Explain that the attempt expired and invite a return tomorrow |
| Already played | An attempt exists for the same phone and local date | Block a new session and show **You've already played today** |

The 120 ms floor is a configurable anti-abuse heuristic, not proof of cheating or physiological impossibility.

### Daily attempt policy

- Shop day boundaries use **Asia/Kolkata**. Store event timestamps in UTC and derive `play_date` on the server.
- Validation, verification, and high-latency failures before reservation do not consume a play.
- Once Start successfully reserves an attempt, a win, loss, early tap, abandonment, or timeout consumes that day's play.
- A network retry must recover or finalize the same attempt, without creating another attempt or coupon.
- Refreshing the page must not reset eligibility. Provide a way to recover today's result using the existing session where available; staff can find issued coupons by phone.

## 6. Staff Journey

1. Staff opens `/staff` and signs in with the shared staff password.
2. Staff searches by coupon code or normalized phone number.
3. Results show customer name, phone, prize snapshot, reaction time, issued time, validity, and redemption status. Phone searches may return multiple historical coupons.
4. Staff selects the valid coupon and taps **Mark Redeemed** as part of handing over the prize.
5. The server atomically records redemption and returns confirmation. Staff hands over the prize only after confirmation.

Already redeemed, expired, or invalid coupons cannot be redeemed. Concurrent requests for one code must yield exactly one successful redemption. Failed or uncertain requests must display the latest server status before another handover.

## 7. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | Validate required name and phone fields server-side, trim whitespace, cap input lengths, and normalize phone numbers consistently. Default country is India; document the supported number format. |
| FR-02 | Verify Turnstile before reserving an attempt. Bind successful verification to the created session. |
| FR-03 | Enforce `UNIQUE(phone, play_date)` in persistent storage and reserve eligibility atomically. |
| FR-04 | Generate session tokens and random waiting delays on the server. Reject client changes to authoritative session parameters. |
| FR-05 | Accept only one result per session. Duplicate submissions return the stored result without changing it. |
| FR-06 | Issue a coupon only for a qualifying finalized attempt. Persist the result and coupon atomically. |
| FR-07 | Generate codes as `JB-XXXXX` using `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Enforce a database unique constraint and retry collisions. |
| FR-08 | Save prize details and eligibility thresholds with each attempt so later configuration changes do not alter issued rewards. |
| FR-09 | Require server-validated staff authentication for every search and redemption request. |
| FR-10 | Redeem with a conditional atomic update that checks validity and unredeemed status. |
| FR-11 | Support owner-maintained prize configuration without an owner UI. Use a D1 configuration record if changes must take effect without deployment. |
| FR-12 | Provide cleanup of expired sessions and deletion according to the approved retention policy. |

## 8. Timing and Integrity

The original proposal uses:

`adjusted_ms = tap_received_ms - flash_issued_ms - baseline_rtt_ms - waiting_delay_ms`

This estimates reaction time. It also includes differences in network latency, browser scheduling, and rendering. A server timestamp cannot establish exactly when a remote screen changed, and a modified client can automate a tap after receiving the session parameters.

### Required implementation behavior

- The server owns the session, waiting delay, timing records, thresholds, final outcome, and coupon issuance. Never accept a client-provided reaction duration as authoritative.
- Take multiple connection samples before reservation and use a documented baseline method, such as the median. Do not trust a client-provided latency value without validation; any client-assisted measurement remains an abuse surface.
- Block reservation when baseline RTT exceeds 1,000 ms. Define an acceptable latency-variation limit during validation.
- Use millisecond timestamps for timing arithmetic. The response-to-render sequence must match the formula's assumed delay start.
- Treat taps during waiting as consumed early attempts. Reject negative or sub-floor adjusted results without awarding prizes.
- Define tap expiry as **10 seconds after the estimated target appearance**, accounting for the waiting delay and documented network allowance. Session recovery records may remain available longer; cleanup must not erase finalized attempts.
- Make session consumption and attempt finalization atomic, including races between taps, expiry, and retries.

### Launch gate

Validate the approach on actual supported phones and shop Wi-Fi/mobile connections. Before implementation sign-off, define an acceptable timing-error tolerance and test near the 120 ms and 450 ms boundaries against an independent local measurement. Document expected false wins/losses and automation risks.

If the reward requires stronger integrity than this method can provide, restrict play to a controlled kiosk or redesign reward eligibility before launch. The product must not claim cheat-proof or precisely measured reaction times.

## 9. Proposed Architecture

| Layer | Proposed technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Customer game and staff page |
| Static hosting | Cloudflare Pages | Serve the web application |
| API | Cloudflare Workers | Eligibility, sessions, outcomes, staff operations |
| Persistent storage | Cloudflare D1 | Attempts, sessions, configuration, and redemption records |
| Bot protection | Cloudflare Turnstile | Verify requests before issuing sessions |

Keep authoritative attempt and redemption transitions in the database rather than eventually consistent session caches. Confirm the selected D1 transaction/batch and read-consistency behavior during implementation. Avoid external calls between steps that must commit atomically.

Provider pricing, quotas, backup features, and deployment behavior must be verified against current documentation before launch. Zero monthly cost is a target, not an indefinite guarantee.

### API contract outline

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/ping` | Connection sampling; does not consume a play |
| POST | `/api/flash` | Validate inputs and verification, reserve the attempt, create session, return server delay |
| POST | `/api/tap` | Finalize one session and return the stored result on retries |
| GET | `/api/result` | Recover a result using a valid session credential |
| POST | `/api/staff/login` | Establish a staff session |
| POST | `/api/staff/logout` | End the staff session |
| POST | `/api/staff/search` | Authenticated search by phone or code |
| POST | `/api/staff/redeem` | Authenticated atomic redemption |

Use HTTPS, explicit request validation, consistent error codes, and no caching of personal or staff API responses. Session tokens must not appear in logs or URLs.

## 10. Data Model

### `attempts`

| Field | Type / constraint |
|---|---|
| `id` | INTEGER primary key |
| `created_at`, `completed_at` | UTC timestamp; completed time nullable |
| `play_date` | Shop-local date; required |
| `name`, `phone` | Required normalized values |
| `status` | `reserved`, `won`, `lost`, `too_early`, or `expired` |
| `reaction_ms` | Nullable integer |
| `win_threshold_ms`, `minimum_reaction_ms` | Configuration snapshot |
| `prize_label`, `prize_terms` | Prize snapshot |
| `code` | Nullable TEXT; UNIQUE |
| `expires_at` | Nullable UTC coupon expiry; policy required before launch |
| `redeemed` | Boolean; default false |
| `redeemed_at` | Nullable UTC timestamp |

Required constraint: `UNIQUE(phone, play_date)`. Index staff search fields. Prefer `status` as the outcome source of truth rather than a redundant `won` flag.

### `sessions`

| Field | Type / constraint |
|---|---|
| `token` | Cryptographically random TEXT primary key |
| `attempt_id` | Required unique reference to attempt |
| `flash_issued_ms` | Server epoch milliseconds |
| `latency_baseline_ms` | Validated baseline integer |
| `waiting_delay_ms` | Server-generated integer, 1,500–4,500 |
| `expires_at_ms` | Authoritative expiry |
| `used` | Boolean; default false |
| `created_at` | UTC timestamp |

### `config`

Store the active prize label and terms, thresholds, coupon validity policy, timezone, and configuration version. Staff sessions require a documented expiry and revocation mechanism.

## 11. Security and Privacy

- Store Turnstile and staff authentication secrets as Worker secrets; never ship them to the browser or commit them to source control.
- Use parameterized SQL. Escape rendered text and protect CSV exports from spreadsheet formula injection separately.
- Rate-limit session creation, staff login, search, and redemption. Do not rely on IP address alone because shop customers may share Wi-Fi.
- Use secure, HttpOnly, SameSite staff session cookies, bounded session lifetime, and CSRF protection appropriate to the deployment.
- Return minimal information to unauthenticated users. Coupon lookup by phone is staff-only.
- Collect name and phone for eligibility and prize validation only. Do not use them for marketing without separate consent.
- Show: **“We use your name and phone to enforce one play per day and verify your prize at pickup.”** Link a fuller notice explaining 30-day automatic retention.
- Remove customer records automatically after the approved 30-day retention period through regular cleanup. No customer deletion-request interface is included. Avoid personal data and credentials in routine logs.
- Shared staff credentials cannot identify which individual redeemed a prize. Individual staff accounts are outside v1.

## 12. UX and Accessibility

Required states: `form`, `checking`, `waiting`, `flash`, `submitting`, `result_win`, `result_lose`, `result_too_fast`, `result_expired`, `already_played`, and `error`.

- Mobile-first layout with a large target usable one-handed and no scrolling during play.
- Accessible labels, readable contrast, visible focus, and keyboard activation.
- Communicate the target change through text and color; never rely on color alone.
- Use a single static visual change, without strobing. Respect reduced-motion preferences and remove decorative movement.
- Support light and dark themes.
- Display reaction times as estimates if validation confirms the timing method remains approximate.
- Preserve winning codes for review and recovery. Staff pages must work on phones and counter tablets.

## 13. Errors and Recovery

| Key | Message / behavior |
|---|---|
| `already_played` | “You've already played today — come back tomorrow.” |
| `too_early` | “You tapped too early. Today's play is used — come back tomorrow.” |
| `session_expired` | “Your play expired. Come back tomorrow.” |
| `verification_failed` | “We couldn't verify your request — please refresh and try again.” Before reservation, no play is consumed. |
| `too_many_requests` | “Lots of requests right now — try again in a moment.” Preserve any existing attempt. |
| `high_latency` | “Your connection seems slow — try a stronger connection.” No play is consumed before reservation. |
| `network_error` | “Connection problem — check your signal.” Retry or recover the same session; never offer a new daily play implicitly. |
| `invalid_coupon` | Staff: “No valid coupon found.” |
| `already_redeemed` | Staff: show the existing redemption timestamp; no second redemption. |
| `coupon_expired` | Staff: show expiry; disable redemption. |

## 14. Acceptance Criteria

1. A valid customer can complete the full flow on a supported phone and see the correct result for the configured boundaries: 119 ms invalid, 120 ms eligible, 449 ms win, and 450 ms loss.
2. Two simultaneous Start requests for the same normalized phone and local date produce only one reserved attempt.
3. The date limit resets at midnight in Asia/Kolkata, including when UTC is on a different date.
4. Early taps, abandonment, and expiry consume the reserved attempt; pre-reservation verification and connection failures do not.
5. Duplicate or concurrent tap requests return one persisted outcome and at most one coupon.
6. A collision during coupon generation cannot create duplicate codes or lose the finalized result.
7. Staff can find an issued coupon by code or phone and distinguish valid, expired, and redeemed records.
8. Concurrent redemption requests produce exactly one successful redemption; retrying a completed request shows the recorded status.
9. Unauthenticated requests cannot search customer data or redeem coupons. Staff sessions expire and logout ends access.
10. No secret is present in the frontend bundle or repository. Invalid verification and rate limits are enforced by the API.
11. A lost response after completion can recover the same result without another play or coupon.
12. The interface passes mobile, keyboard, contrast, and reduced-motion checks. Near-threshold timing behavior passes the agreed real-device validation gate.

## 15. Delivery Phases

| Phase | Deliverable / exit condition |
|---|---|
| 0 — Decisions and setup | Approve prize, validity, retention, timing tolerance, and hosting assumptions; scaffold environments |
| 1 — UI prototype | All customer and staff states usable on a real phone with simulated results |
| 2 — Storage | Migrations, unique constraints, session lifecycle, and concurrency checks pass |
| 3 — Game integration | Live timing flow, result recovery, and device validation pass |
| 4 — Security | Verification, authentication, rate limits, input validation, and privacy handling pass |
| 5 — Redemption | Search and atomic redemption tested with staff, including uncertain network responses |
| 6 — Launch | Production URL, tested QR, staff walkthrough, export/recovery instructions, usage monitoring, and launch checklist completed |

## 16. Operations and Launch Decisions

Use a stable QR destination controlled by the owner. Provide instructions for credential rotation, configuration changes, data export, recovery, and session cleanup. Verify available backup/recovery features and document a tested recovery procedure. Monitor request and database usage without logging customer inputs.

The owner must decide before launch:

- Exact prize and redemption terms, including any purchase requirement.
- Coupon expiry, redemption hours, and handling when a prize is unavailable.
- Whether losses receive consolation offers; default is none.
- Personal-data retention is confirmed as 30 days with automatic cleanup and no customer deletion-request interface.
- Acceptable timing error, reward abuse tolerance, and whether customer phones or only a controlled kiosk may play.
- Supported phones/browsers and who maintains production credentials and recovery documentation.

The launch is ready when these decisions are recorded, acceptance criteria pass, staff have practiced redemption, and provider allowances have been verified.
