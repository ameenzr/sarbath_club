# Agent Development Task List

**Project:** Sarbath Club — Reaction Tap Game  
**Updated:** 18 September 2026  
**Source of truth:** [PRD.md](PRD.md)  
**Current status:** Local implementation and verification complete. Production policy, Cloudflare access, remote checks, and physical acceptance pending.

## 1. Start command

Paste this instruction into the coding agent to begin:

```text
Read PRD.md and TASKS.md in this project. Implement the next unchecked task whose
dependencies are satisfied, verify its exit criteria, record evidence, and continue
through the remaining tasks. Work in the existing project root. Preserve existing
files and user changes. Do not stop after each task to ask whether to continue.

Follow the human-intervention protocol in TASKS.md. Ask only for missing decisions,
access, physical checks, or authorization that is actually needed. Prepare a concrete
result before requesting approval. Continue independent work while a checkpoint is
pending. Never invent approval, credentials, device-test results, or production URLs.

Use local mocks and synthetic data while external access is unavailable. Keep mock
prizes and test credentials out of production. Update the progress log after each
completed task. Finish with completed work, verification results, and any remaining
human checkpoints.
```

## 2. Agent working rules

1. Read applicable repository instructions and inspect current files before editing. This plan does not authorize deleting or overwriting unrelated work.
2. Follow the PRD where the original pasted task list differs. Record material design choices in `docs/decisions.md` and API contracts in `docs/api.md`.
3. Complete tasks sequentially where dependent. A blocked deployment or owner decision does not block unrelated local implementation.
4. Choose routine implementation details autonomously. Do not require human approval for scaffolding, local migrations, reversible edits, tests, or documentation.
5. Use existing authorization for external actions. Do not repeatedly request approval already given. Account login, MFA, and secret entry may still require human action.
6. Verify current official documentation before selecting dependency versions or using Cloudflare configuration, transaction APIs, CLI commands, quotas, or recovery features. Record sources and verification dates. Do not copy stale commands from the pasted draft.
7. Define and implement project commands such as `npm run dev`, `npm run build`, `npm run check`, `npm run test`, and `npm run test:e2e`. Document the combined local frontend/API environment and actual ports. Do not claim a command exists until added.
8. Mark a task complete only when its exit criteria pass. Record failed or unavailable checks honestly. A mock pass is not a production verification.
9. Use synthetic names, numbers, and coupons in tests. Never print secrets, put them in chat, embed them in command arguments, or commit them.
10. After verification, continue to the next available task. End only when the requested scope is complete or all remaining work depends on unavailable human input or access.

## 3. Human-intervention protocol

`HUMAN_REQUIRED` below is a plain-text notification convention, not a shell command or a built-in automation feature.

When human action is necessary, issue this concise notice through the available question mechanism, or as a direct question when the agent must yield:

```text
HUMAN_REQUIRED [H-ID] — Short title
Task: T-ID
Needed: One specific decision or action.
Reason: Why the agent cannot complete this step independently.
Ready for review: File, preview, test report, or prepared change.
Action: Exact safe command or dashboard steps, with the target environment named.
Reply with: The decision or a completion confirmation; never a secret.
Blocked: Only the dependent tasks.
Continuing: Independent work that can proceed.
```

For a decision, replace command/dashboard steps with concise options and a recommendation. For commands, resolve project names and paths first, check the installed CLI, and explain what the command changes. Never ask the owner to run a command with unresolved placeholders. Have the human enter secrets into an interactive secret prompt or provider dashboard.

Record checkpoint status in `docs/decisions.md`: `pending`, `requested`, `resolved`, or `not required`, plus the decision and date. Do not store secret values. Silence or elapsed time is not approval. A blocking response remains pending until answered; continue other work without repeating unchanged questions.

### Human checkpoint register

| ID | Trigger | Required human contribution | Blocks |
|---|---|---|---|
| H-01 | Before production prize configuration | Prize, purchase requirement, expiry, redemption hours, unavailable-prize policy, consolation policy | Production rewards only; use labeled demo values locally |
| H-02 | Before collecting real customer details | Retention duration, deletion contact, supported devices, customer-phone versus kiosk mode | Production data collection and final privacy text |
| H-03 | Remote environment work lacks access | Sign in to the selected Cloudflare account, complete MFA, confirm target account if ambiguous; GitHub access only if Git integration is chosen | Remote resource setup; local work continues |
| H-04 | Real verification/authentication setup | Create or select Turnstile configuration and enter required secrets through secure provider tooling; return only completion confirmation and public configuration | Real-service verification and authenticated remote testing |
| H-05 | Timing prototype is measured | Agree on timing-error tolerance and acceptable abuse risk; accept measured results or choose a revised approach | Real-prize launch; other implementation continues |
| H-06 | Preview and test script are ready | Test on actual phones and shop networks; staff practices search and redemption; scan the printed QR | Physical/device acceptance |
| H-07 | Production package is ready and authorization is still missing | Approve the named deployment, production migration, and enablement scope; do not ask again if already authorized | Only the unauthorized production action |
| H-08 | A destructive change or paid resource is actually necessary | Approve the specific change/cost after reviewing alternatives and recovery plan | That action only |

Ask H-01 and H-02 together early. Request access only when needed. Prepare the timing test method and proposed tolerance before H-05. For H-07, present the preview, test summary, migration plan, remaining limitations, and rollback steps first.

### Resume commands

The owner may paste any of these natural-language instructions:

```text
Continue from TASKS.md. Recheck the recorded checkpoint responses and resume the
next available task. Do not repeat questions that have already been answered.
```

```text
H-03 is complete: I signed in to the intended Cloudflare account. Verify access
without printing credentials and continue with the prepared environment setup.
```

```text
Show the current task status, completed checks, and only the human actions that
are blocking further progress.
```

## 4. Implementation checklist

### Phase 0 — Inspect and establish the plan

- [x] **T-01 — Inspect repository and record decisions.** Read PRD and local instructions; inventory existing files. Create `docs/decisions.md` with defaults from the PRD and unresolved H-01/H-02/H-05 decisions. Defaults include Asia/Kolkata, 120 ms floor, 450 ms win boundary, 1.5–4.5 second delay, and no consolation offer. Do not create an extra nested project directory. **Exit:** assumptions, unknowns, and next task recorded; existing assets preserved.

- [x] **T-02 — Verify architecture and define contracts.** Depends on T-01. Confirm current React/Vite and Cloudflare Pages Functions/D1 workflows in official documentation. Select one coherent deployment model; default to Pages plus Pages Functions unless evidence requires a documented change. Define all PRD routes, request/response shapes, errors, cookie/header session transport, idempotent Start and Tap behavior, and session recovery. Define atomic database operations supported by the selected runtime. **Exit:** `docs/api.md` and architecture decisions resolve the full session lifecycle without client-authoritative delay or timing.

- [x] **T-03 — Scaffold local application.** Depends on T-02. Add frontend, API directories, dependency lockfile, Cloudflare configuration, local D1 binding `DB`, and the required development/check commands. Ignore dependencies, builds, local runtime state, secret-bearing env files, and credentials; provide nonsecret env examples. Use an explicitly separate mock/test mode. **Exit:** local frontend/API smoke check and production build pass; no real cloud account is required.

### Phase 1 — Timing feasibility and UI prototype

- [x] **T-04 — Build a timing experiment.** Depends on T-03. Implement connection sampling and a diagnostic target/tap loop using synthetic data. Document timestamp placement, render scheduling, baseline derivation, network allowance, jitter handling, and expiry relative to estimated appearance. Explain why client-influenced latency and scripted taps remain risks. Use browser-local measurements only as diagnostic comparisons, not prize authority. **Exit:** reproducible measurement procedure and initial results in `docs/timing-validation.md`; proposed numerical tolerance and jitter limit ready for H-05. Do not claim a server can observe actual screen appearance.

- [x] **T-05 — Define the customer state machine.** Depends on T-02/T-03. Implement every PRD state, including checking, submitting, expiry, and errors. Add development fixtures for every outcome without public hardcoded winning API routes. **Exit:** each state is reachable in a local fixture flow; production cannot enable mock rewards accidentally.

- [x] **T-06 — Implement form, waiting, and tap screens.** Depends on T-05. Add accessible fields, shared phone normalization rules, loading/verification states, PRD privacy copy, and immediate duplicate-submit protection. Accept waiting delay from the server contract. Handle early taps and cancel timers on unmount; a rerender must not create a new delay or session. Support keyboard and pointer input. **Exit:** fixture flow works; early taps, timer cleanup, and repeated input have defined behavior.

- [x] **T-07 — Implement outcomes and recovery UI.** Depends on T-06. Show prize snapshot, code, validity, and friendly PRD messages. Distinguish expired plays from normal losses. Provide pending/recovering states for uncertain requests. **Exit:** every outcome and network recovery path renders correctly; the UI never offers a second daily play after reservation.

### Phase 2 — Persistent state and invariants

- [x] **T-08 — Implement schema and local migrations.** Depends on T-02/T-03. Create attempts, sessions, config, and any required auth/rate-limit records. Include PRD fields, code uniqueness, daily uniqueness, attempt/session relationship, status constraints, and search indexes. Add idempotency fields if required by the agreed API. Store timing in epoch milliseconds and dates using the shop timezone. **Exit:** clean local migration succeeds; constraints reject duplicate attempts/codes and invalid state; document local and remote migration commands verified against the installed CLI.

- [x] **T-09 — Implement shared validation and lifecycle helpers.** Depends on T-08. Validate bounded inputs, normalize Indian phone formats consistently, derive local date server-side, generate secure tokens/codes, and snapshot configuration. Preserve valid name text; handle CSV formula escaping when exporting, not by altering stored customer names. **Exit:** meaningful boundary tests cover normalization, midnight, thresholds, code alphabet, and invalid input.

- [x] **T-10 — Implement atomic reservation and finalization.** Depends on T-09. Reserve a daily attempt with its session in one supported atomic operation. Finalize session consumption, outcome, and coupon together using conditional writes; retry bounded code collisions. Implement expiry and recovery without recreating attempts. **Exit:** database-backed concurrency tests prove one reservation and one final outcome; injected failures cannot leave a coupon without its finalized attempt or consume a session without its result.

### Phase 3 — Customer API and security

- [x] **T-11 — Implement verification and request protection.** Depends on T-02/T-03. Verify Turnstile server-side before reservation, bind successful verification to the attempt flow, validate expected verification metadata, and handle expired or failed tokens. Add request size/method/content checks and no-store responses. Use official test configuration locally; fail closed if required production configuration is missing. **Exit:** invalid verification cannot create an attempt; approved retry flow does not require replaying a consumed verification token incorrectly.

- [x] **T-12 — Implement ping and Start (`/api/flash`).** Depends on T-04/T-10/T-11. Keep ping non-consuming. Enforce validated sampling policy, configuration, input, and daily eligibility before atomically reserving. Return server-owned delay and an opaque session credential. Implement recovery for a lost Start response using the contract's idempotency mechanism; do not let arbitrary phone lookup retrieve a session. **Exit:** concurrent Start, high latency, verification failure, and lost-response retries preserve PRD play-consumption rules.

- [x] **T-13 — Implement tap and result recovery.** Depends on T-12. Capture receipt time at the documented point before avoidable work. Apply the agreed timing formula, early-tap handling, thresholds, and expiry. Finalize atomically. Duplicate taps and authenticated result recovery return the persisted outcome without a new code. Keep session credentials out of URLs and logs. **Exit:** boundary, replay, expiry-race, and lost-response tests pass; result access cannot expose another session's data.

- [x] **T-14 — Implement rate limits and cleanup.** Depends on T-10/T-11. Protect Start, staff login/search/redeem, and other abuse-sensitive routes with configurable limits appropriate to shared Wi-Fi. If using database counters, use an atomic increment and actual expiry cleanup; an ignored old row still occupies storage. Ensure limits do not destroy a reserved attempt or change a stored outcome. Choose a supported cleanup scheduler and document how it runs. **Exit:** concurrent increments enforce limits and stale counters/sessions are removed while required results remain recoverable.

- [x] **T-15 — Integrate the real game flow.** Depends on T-07/T-12/T-13/T-14. Replace fixtures with the API, verification, sampling, and recovery lifecycle. Preserve the same attempt across uncertain responses and refreshes according to the credential policy. **Exit:** complete local end-to-end wins/losses/early taps/expiry/recovery pass with synthetic data; mocked verification is explicitly identified.

### Phase 4 — Staff redemption

- [x] **T-16 — Implement staff login and logout.** Depends on T-11/T-14. Validate the staff secret server-side and issue a bounded Secure/HttpOnly/SameSite session for production. Add expiry, logout/revocation, origin/CSRF protections, and login limits. Document any local HTTP-only development exception. Never persist the password in frontend storage or send it with every search. **Exit:** unauthorized, expired, revoked, and cross-site requests cannot use protected routes.

- [x] **T-17 — Implement search and atomic redemption.** Depends on T-10/T-16. Return only necessary fields; normalize code/phone search, bound results, and show historical coupons clearly. Redeem only a winning, valid, unredeemed coupon with a conditional atomic update. **Exit:** simultaneous redemption yields one successful change; retries reveal the actual stored status, and losses/expired coupons cannot be redeemed.

- [x] **T-18 — Build `/staff` interface.** Depends on T-17. Add login/logout, search, visible prize/status/timestamps, and confirmation after successful redemption. Disable duplicate actions immediately; recover uncertain requests before presenting another handover action. **Exit:** mobile staff flow and session-expiry behavior pass browser checks.

### Phase 5 — Design and operational readiness

- [x] **T-19 — Apply brand and accessibility.** Depends on T-15/T-18. Inspect `SARBATH CLUB logo and colours.pdf` using the appropriate PDF workflow when implementing design. Apply its actual brand assets/colors with accessible contrast. Support narrow screens, large tap targets, light/dark themes, reduced motion, clear focus, and a static color/text change without strobing. **Exit:** inspect representative screens in both themes; keyboard, contrast, reduced-motion, and mobile viewport checks pass.

- [x] **T-20 — Implement privacy, retention, and owner configuration.** Depends on T-08; final production settings depend on H-01/H-02. Add configurable prize terms and validity, privacy notice/contact, retention cleanup, and a documented deletion/export process. Preserve eligibility while it is still required and respect outstanding coupon obligations under the approved policy. **Exit:** synthetic-data tests verify cleanup, snapshot stability, and export escaping; unresolved owner values cannot silently become live policy.

- [x] **T-21 — Complete regression and security verification.** Depends on T-15/T-18/T-19/T-20 implementation. Run build/checks and meaningful tests mapped to PRD acceptance criteria 1–12. Include reservation/tap/redemption races, time boundaries, code collisions, failed writes, lost responses, access control, and production mock exclusion. Inspect built assets for actual credential leakage without printing secret values. **Exit:** `docs/test-report.md` lists commands, outcomes, environment, and outstanding physical checks; all actionable local failures fixed.

- [x] **T-22 — Write owner and developer runbooks.** Depends on T-21. Create README and `docs/operations.md` with local setup, verified deployment/migration commands, nonsecret config inventory, secret-entry steps, staff instructions, credential rotation, exports, recovery/rollback, cleanup, and troubleshooting. Verify current quotas and estimate calls/reads/writes from the implemented flow rather than assuming three requests per play. **Exit:** every documented command matches the project and installed tooling; backup/recovery availability is verified rather than assumed.

### Phase 6 — Remote verification and launch

- [ ] **T-23 — Provision isolated preview resources.** Depends on T-03/T-08 and H-03 when access is missing. Confirm account/environment, create or use separate nonproduction D1 and app resources, apply nonproduction migrations, and configure real verification through H-04 when needed. Choose direct deployment or Git integration; GitHub is not a mandatory dependency. Deploy only within existing authorization and provider permissions. **Exit:** preview URL works, API reaches the intended database, real verification works, and no production/customer data is used.

- [ ] **T-24 — Validate timing and staff use on real devices.** Depends on T-04/T-21/T-23; requires H-05/H-06. Prepare exact steps and a results sheet before asking for physical checks. Measure representative devices and shop Wi-Fi/mobile conditions, including near-threshold behavior, touch handling, and uncertain redemption responses. **Exit:** measurements meet recorded tolerance; owner resolves risk acceptance; staff performs the flow successfully. If results fail, fix/retest or document and obtain a changed product decision; do not mark the gate passed.

- [ ] **T-25 — Prepare production package and QR.** Depends on T-22/T-24 and H-01/H-02/H-04. Resolve the stable production URL, real prize config, retention, environment bindings, migration plan, and rollback plan. Generate a print-ready QR from that actual URL and document regeneration. Keep the public game disabled until launch criteria pass. **Exit:** concrete release package and QR ready; any remaining authorization request H-07 identifies exact targets and changes.

- [ ] **T-26 — Deploy, smoke-test, and enable launch.** Depends on T-25 and any necessary H-07 authorization. Apply prepared production changes to the verified target. Run limited synthetic smoke tests with isolated test records and document their disposition. Confirm routes, verification, staff access, configuration, and cleanup setup. Obtain H-06 printed-QR confirmation against the live destination. Enable customer play only when all launch gates pass. **Exit:** tested live URL, scan result, and launch state recorded; rollback used if a material check fails.

- [ ] **T-27 — Handoff and close.** Depends on T-26. Hand over staff instructions and owner recovery documentation. Record deployments, evidence, approved decisions, known timing limitations, and any operational follow-ups. **Exit:** PRD acceptance matrix complete; owner can redeem and follow the recovery runbook; no required task is described as finished without evidence.

## 5. Corrections from the original draft

These rules prevent the implementation agent from reintroducing superseded behavior:

- Reserve the daily play at Start, not after a tap. Ping must not insert an incomplete session that violates required fields.
- Use server-generated waiting delay and a documented, validated latency method. Do not accept arbitrary client delay or latency as authority.
- Verify Turnstile before reservation. Do not postpone all bot protection to the tap endpoint.
- Return the stored result on duplicate taps instead of discarding the only recovery route after a lost response.
- Measure expiry from estimated target appearance, not a fixed interval from an unrelated timestamp.
- Enforce coupon uniqueness and atomic transitions in storage; a pre-insert lookup alone does not prevent races.
- Use supported D1 atomic operations; do not assume a generic interactive SQL transaction is available in the runtime.
- Use staff sessions and conditional redemption; checking status followed by an unconditional update is insufficient.
- Do not alter names to protect CSV exports. Escape exported fields at export time.
- Rate-limit counters need atomic increments and cleanup. `INSERT OR REPLACE` by itself is not an increment, and ignoring old rows does not remove them.
- Treat timing precision, free-tier capacity, and backup capabilities as items to verify. Do not promise cheat-proof play or indefinite zero cost.

## 6. Progress log

Update after each task. Use `done`, `in progress`, `blocked`, or `pending`; a partial task stays unchecked above.

| Date | Task | Status | Evidence / files / checks | Next action or checkpoint |
|---|---|---|---|---|
| 2026-09-18 | Planning | done | PRD.md and TASKS.md created | Implementation started on user instruction |
| 2026-09-18 | T-01–T-03 | done | docs/decisions.md, docs/api.md; React/Pages scaffold; local build and API smoke pass | Local implementation continued |
| 2026-09-18 | T-04–T-07 | done | State machine, timer/input/screens/recovery; diagnostic implementation; five local timing trials | H-05/H-06 physical timing acceptance pending |
| 2026-09-18 | T-08–T-10 | done | Two local migrations; normalization/date/boundaries; real D1 race/collision/rollback tests | Remote migration remains T-23 |
| 2026-09-18 | T-11–T-15 | done | Server verification, sampling, atomic Start/Tap, rate counters/cleanup and live local browser flow | Real-site configuration pending H-04 |
| 2026-09-18 | T-16–T-19 | done | Staff sessions/search/redemption; API access/replay tests; branded UI and inspected mobile/desktop themes | H-06 staff/device walkthrough pending |
| 2026-09-18 | T-20 | done | H-01/H-02 resolved: free sarbath, seven-day validity, 30-day automatic retention and no customer deletion feature; config/privacy updated; cleanup tests pass | Launch acceptance remains separate |
| 2026-09-18 | T-21–T-22 | done | docs/test-report.md, README.md, docs/operations.md; build/check; four DB/API test groups; five browser tests; audit 0 findings | Remote recovery rehearsal remains launch prerequisite |
| 2026-09-18 | T-23 | in progress | H-03/H-04 resolved; isolated preview Pages/D1 created; migrations applied; real public site key deployed and encrypted secret entries confirmed | Complete remote verification/staff acceptance after owner policy; customer play remains disabled |
| 2026-09-18 | T-24–T-27 | pending | Timing test procedure, scheduler code, QR generator and release/runbook prepared | Access, real configuration, policies, physical checks and release authorization |

For a blocked task, record the exact dependency and continue the next independent task. Do not mark the whole project blocked while useful authorized work remains.



For a blocked task, record the exact dependency and continue the next independent task. Do not mark the whole project blocked while useful authorized work remains.
