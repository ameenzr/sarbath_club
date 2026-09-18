# API contract

All errors return JSON `{ error: key }`, no-store. POST requires JSON, bounded body and same-origin browser requests. Local development uses Vite proxy; API tests may omit Origin. Remote POST requires a matching Origin. Credentials never go into URLs.

| Route | Request | Response |
|---|---|---|
| POST /api/ping | `{}` → challenge; then `{challenge}` → ack | `{challenge}` then `{sample}`; three server-observed samples linked to browser sampling cookie |
| POST /api/flash | `{name,phone,turnstileToken}` and `Authorization: Bearer <start credential>` | `{status,waitingDelayMs,expiresAtMs,prize}`; same credential recovers Start after lost response |
| POST /api/tap | `{early:boolean}` with same bearer | Stored result `{status,reactionMs,code,prize,expiresAt}` |
| GET /api/result | Same bearer in Authorization | Session/attempt state; finalizes expiry when appropriate |
| POST /api/staff/login | `{password}` | `{ok:true}` plus HttpOnly staff cookie |
| POST /api/staff/logout | `{}` plus staff cookie | Revokes cookie/session |
| POST /api/staff/search | `{query}` plus staff cookie | `{results:[...]}`; newest 10 winning coupons by phone or exact code |
| POST /api/staff/redeem | `{id}` plus staff cookie | `{ok,alreadyRedeemed,redeemedAt}`; conditional winning/unexpired/unredeemed update |

Phone accepts Indian 10-digit mobile, +91, or 0091 forms with spaces/hyphens/parentheses; stores canonical +91 format. Name 1–80 characters. Bearer credential is a browser crypto.randomUUID value; database stores only its SHA-256 digest. Cookies are bounded, SameSite=Strict and HttpOnly; Secure on HTTPS. Staff password is used only at login.

Attempts are reserved at Start. Verification/latency failures before reservation consume nothing. Reservation inserts attempt then session in a D1 batch; session selects the attempt by the unique credential digest. Finalization conditionally updates reserved attempt, then marks corresponding session used in the same batch. Replay returns persisted result. Code collisions roll back and retry. Redemption is one conditional UPDATE, then primary readback.

Sampling: server issues challenge, browser immediately acknowledges; server observes duration, records three samples, and uses median capped at 1000 ms with spread ≤150 ms. A browser can intentionally delay ack, so sampling does not prove network latency. Reward flow remains approximate and launch gated.
