# Human acceptance — Sarbath Club

Prepared 19 September 2026. These are pending checks, not recorded passes.

## Before the session

The remote preview is https://sarbath-club-preview.pages.dev/. On 19 September 2026 the owner explicitly authorized enabling customer play for testing. GAME_ENABLED is now true on preview; production remains unlaunched. Do not paste passwords or secret keys into chat.

Agree on timing tolerance and abuse risk before launch. The proposed tolerance is p95 absolute error at most 50 ms over at least 30 trials per supported device/network condition; it is not yet owner-approved. Browser timer comparisons are not independent display/touch measurements.

## Customer and counter walkthrough

1. On representative phones and shop Wi-Fi/mobile data, check readability, large tap target, keyboard/focus where applicable and no horizontal overflow.
2. Start without entering personal details or completing verification. Tap while waiting, then immediately play again. A failed result must not impose a next-day limit.
3. Win in the 120–449 ms eligible range. Confirm identity/verification appears only now. Use clearly synthetic identity and a shop-controlled test number. Complete the real Managed Turnstile widget.
4. Claim once. Check one free sarbath, terms and exact expiry seven days from issuance. Refresh and confirm the same code returns.
5. Choose Play Again and confirm the old code remains visible in this tab. Win again and try the same number; a second coupon must be blocked until expiry. Do not wait a week or change clocks/database to simulate this on remote data: automated tests cover exact expiry.
6. Staff opens /staff and enters the actual staff password securely. Search by code and phone. Confirm coupon details and expiry. Mark redeemed once, then verify a second redemption is unavailable.
7. Repeat a winning claim for that phone after redemption: it must remain blocked until the original expiry.
8. Test network loss/refresh while waiting and around claim/redemption. Recover the saved result; never restart a pending timer or hand over another prize after an uncertain redemption response without checking status.
9. Scan the preview QR if prepared. A final printed production QR remains a separate release check.

## Timing record

Use an independent high-frame-rate recording or agreed measurement method for display change and touch. Measure intervals near 120 and 450 ms, normal/poor connection and foreground/background transitions. Record false wins/losses and sample variation. Do not call browser callback timestamps physical timing proof.

| Device/browser | Network | Trials | Measurement method | p95 error | False wins/losses | Owner acceptance |
|---|---|---|---|---|---|---|
| Pending | Shop Wi-Fi | — | — | — | — | Pending |
| Pending | Mobile data | — | — | — | — | Pending |

Return device/browser, network, walkthrough failures, timing measurements and the owner's tolerance/acceptance decision. Return only login/challenge completion confirmation, never credentials.

After the acceptance session, disable the preview again unless continued testing is explicitly authorized. Production provisioning, production cleanup schedule, remote recovery rehearsal and launch authorization remain separate gates.
