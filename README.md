# Sarbath Club — Tap Fast. Sip Free.

A mobile-first reaction game with unlimited anonymous plays and counter redemption. Win first, then enter name/mobile and complete verification to claim one free sarbath. Each phone can hold one unredeemed coupon; redemption immediately makes that number eligible to claim another win. React/Vite serves the UI; Cloudflare Pages Functions and D1 manage plays, claims and redemption.

## Run locally

Use Node 22.12+ or the installed Node 24 runtime. From this directory:

```powershell
npm install
npm run db:local
npm run preview
```

Open [the local preview](http://127.0.0.1:8788). Keep that terminal running. The API and frontend share this address. On localhost, `/staff` includes a **Use local admin** button for development; the API accepts it only for a loopback hostname with `APP_ENV=local`. Local-only `.dev.vars` contains official public Turnstile test configuration and may also contain a staff password for testing the normal sign-in flow. The ignored files must never become remote secret configuration. If starting from a fresh copy, copy `.dev.vars.example` to `.dev.vars` and `.env.example` to `.env.local`.

For frontend hot reload, run `npm run dev:api` in one terminal and `npm run dev` in another. Open `http://127.0.0.1:5173`. Run a build first so `dist` exists. The Vite server proxies API requests to 8788. `?diagnostic` on the Vite URL displays local timing comparisons for development only.

## Staff: redeem a coupon

1. Open `/staff` on the shop's application address and sign in.
2. Enter the coupon code or customer's mobile number.
3. Check the customer's details, prize terms, expiry, and redemption status.
4. Tap **Mark Redeemed** at the moment of handover.
5. **Wait for redemption confirmation before handing over the prize.**

If the connection fails, search the code again to check its current status. Do not give another prize for a coupon already redeemed. Expired coupons cannot be redeemed. Sign out when finished with the device.

## Verification

```powershell
npm run check
npm test
```

With the local preview running:

```powershell
npx playwright install chromium
npm run test:e2e
```

Tests use synthetic records. Browser tests include fixtures and the real local Worker/D1 flow using official Turnstile testing keys. They do not replace real-phone, shop-network, or production verification. See `docs/test-report.md` and `docs/timing-validation.md`.

## Owner operations

Cloudflare login is needed before remote setup. Use `npx wrangler login` and complete sign-in/MFA yourself; never send credentials to the agent. The agent should verify the selected account and prepare an isolated preview before production.

See [the operations runbook](docs/operations.md) for secret rotation, exports, retention, troubleshooting, and deployment. The next agent task and pending human checkpoints are recorded in [TASKS.md](TASKS.md) and [decisions](docs/decisions.md).

If the game stops working, check connectivity, then the Cloudflare Workers & Pages deployment status and D1 usage/errors. Keep staff from handing over unconfirmed prizes. Do not delete the database or repeatedly redeploy without checking the cause.

The app uses estimated reaction times. A modified client can automate play; self-reported phone numbers cannot prove identity. Real-prize launch requires measured timing acceptance and an owner decision on reward abuse tolerance.
