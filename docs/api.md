# API contract

All errors return JSON `{ error: key }`, no-store. POST requires JSON, bounded body and same-origin browser requests. Local development uses Vite proxy; API tests may omit Origin. Remote POST requires a matching Origin. Credentials never go into URLs.

| Route | Request | Response |
|---|---|---|
| POST /api/ping | `{}` → challenge; then `{challenge}` → ack | `{challenge}` then `{sample}`; three server-observed samples linked to browser sampling cookie |
| POST /api/flash | `Authorization: Bearer <start credential>` (no identity fields) | `{status,waitingDelayMs,expiresAtMs,prize}`; same credential recovers Start after lost response |
| POST /api/tap | `{early:boolean}` with same bearer | Stored result `{status,reactionMs,code,prize,expiresAt}` |
| POST /api/claim | `{name,phone,turnstileToken}` with same bearer | Issues coupon for a verified winning play; `{status,reactionMs,code,prize,expiresAt}` |
| GET /api/result | Same bearer in Authorization | Session/play state; finalizes expiry when appropriate |
| GET /api/config | — | `{prize,retentionDays,enabled}` |
| POST /api/staff/login | `{password}` | `{ok:true}` plus HttpOnly staff cookie |
| POST /api/staff/logout | `{}` plus staff cookie | Revokes cookie/session |
| POST /api/staff/search | `{query}` plus staff cookie | `{results:[...]}`; newest 10 coupons by phone or exact code |
| POST /api/staff/redeem | `{id}` plus staff cookie | `{ok,alreadyRedeemed,redeemedAt}`; conditional winning/unexpired/unredeemed update |

## Customer flow

1. **Play anonymously**: Customer taps play — the browser samples connectivity, generates a UUID credential, and calls `/api/flash`. No name, phone, or Turnstile is required.
2. **Tap**: When the screen flashes blue, the customer taps. The browser calls `/api/tap`. The server calculates reaction time (120–449 ms wins).
3. **Claim after winning**: Only if the tap result is `won` (no coupon code yet), the customer sees an identity form and Turnstile. After verification, the browser calls `/api/claim` with name, phone, and Turnstile token.
4. **One coupon at a time**: Each phone may hold one unredeemed coupon. If a phone already has an unredeemed, unexpired coupon, `/api/claim` returns `active_coupon` (409). Redemption immediately releases the phone number so it may claim another winning coupon; expiry also releases it.
5. **Immediate replay**: Lost, too early, or expired plays allow immediate replay with a new UUID.

## Identity and normalization

Phone accepts Indian 10-digit mobile, +91, or 0091 forms with spaces/hyphens/parentheses; stores canonical +91 format. Name 1–80 characters. Bearer credential is a browser crypto.randomUUID value; database stores only its SHA-256 digest. Cookies are bounded, SameSite=Strict and HttpOnly; Secure on HTTPS. Staff password is used only at login.

## Atomicity

Plays are reserved at Start (anonymous). Latency failures before reservation create no play. Failed claim verification preserves the winning play without issuing a coupon. Reservation inserts play then session in a D1 batch; session selects the play by the unique credential digest. Finalization conditionally updates reserved play, then marks corresponding session used in the same batch. Replay returns persisted result. Coupon claiming inserts into coupons and coupon_locks in a batch with phone-level uniqueness. Code collisions roll back and retry up to five times. Redemption is one conditional UPDATE, then primary readback.

## Sampling

Server issues challenge, browser immediately acknowledges; server observes duration, records three samples, and uses median capped at 1000 ms with spread ≤150 ms. A browser can intentionally delay ack, so sampling does not prove network latency. Reward flow remains approximate and launch gated.
