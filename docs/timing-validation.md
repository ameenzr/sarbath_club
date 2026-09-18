# Timing validation

Status: diagnostic implementation ready; real-device acceptance pending H-05/H-06.

## Measurement model

The server issues a connection challenge and records issue milliseconds. The browser acknowledges immediately; receipt minus issue is a server-observed challenge/ack duration. Take three samples, median as baseline; reject median above 1000 ms or spread above 150 ms before reservation. Samples expire after 2 minutes and are bound to the sampling cookie.

Challenge writes, transport, JS scheduling, and database calls influence samples. A malicious client can deliberately delay acknowledgment. The bounds reduce noise and obvious manipulation but do not prove network latency or authentic human reaction. There is no server-observable remote render event.

Start reserves an attempt and session, timestamping before its D1 batch. The browser starts the returned waiting delay when it receives the response. Tap receipt is captured at the beginning of the API handler, before JSON parsing/database/rate-limit work.

`estimate = tapReceipt - startIssue - medianSample - serverWaitingDelay`

Expiry is `startIssue + serverWaitingDelay + medianSample + 10000`. Early taps explicitly report the UI was waiting, which can only disqualify a prize; this is not trusted to establish a valid reaction. Server floor applies independently. A response interrupted before render cannot be replayed as a fresh delay; recover the reserved attempt and let it expire instead.

## Initial evidence

- Local D1 tests verify exact 119/120/449/450 ms classification through the pure classifier, plus real session timing, atomic replay, early taps and expiry.
- Browser fixtures verify timer transitions, early taps, result display and refresh recovery. They do not measure physical display latency.
- The local live-flow test uses the real Pages Function and D1, with Cloudflare's official testing secret. This does not establish real-site Turnstile behavior or timing accuracy on shop devices.
- Automated tests are software evidence, not real-phone validation. No shop-network or independent physical-render measurements have been recorded.

Initial local Chromium comparison (18 September 2026, five scripted trials): browser intervals 304/300/313/306/315 ms; server estimates 313/307/319/316/323 ms; rounded differences +9/+7/+6/+10/+8 ms. Maximum absolute difference 10 ms in this small local sample. This is not a p95 acceptance study or a physical-render measurement. Raw evidence is generated at `test-results/timing-local.json`.

## Diagnostic command

Run the API with `npm run dev:api`, then Vite with `npm run dev`. Open `http://127.0.0.1:5173/?diagnostic` on the development computer. The result includes samples, the browser's approximate local interval, server interval and their difference. Diagnostic code is disabled in the production build and never affects award decisions.

Use synthetic data and a new synthetic number per reserved play. Never reset production daily limits for testing. For phone testing, expose a deliberately configured nonproduction preview; the default local servers bind only to the development machine.

## Proposed acceptance, requiring owner agreement

- p95 absolute error at most 50 ms; sample spread at most 150 ms.
- At least 30 trials per supported device/network condition, including normal Wi-Fi, mobile data and deliberately poor connection.
- Test reaction intervals around 120 and 450 ms against an independent frame/touch measurement, not only the browser callback timestamps. A high-frame-rate external recording can support physical validation.
- Record false wins/losses near both boundaries, device model/browser, baseline and variation, display/touch delay, and whether foreground/background changes affect timing.
- Reject slow/unstable connections without consuming a play. Check page hiding/refresh, queued taps, duplicate events and response loss.

| Device/browser | Network | Trials | p95 error | False wins/losses | Owner decision |
|---|---|---|---|---|---|
| Pending | Shop Wi-Fi | — | — | — | Pending |
| Pending | Mobile data | — | — | — | Pending |

If tolerance fails, investigate timestamp/transport/render assumptions and remeasure. If automation risk is unacceptable for the selected prize, use a controlled kiosk or revise the reward rules with an explicit product decision. Do not silently weaken acceptance to ship.
