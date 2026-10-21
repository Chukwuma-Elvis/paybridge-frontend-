# PayBridge Demo Console (paybridge-frontend)

A static React console that demos the PayBridge API (internal transfers, Paystack transfers, FX, remittance, settlement) with a live log pane. Deployed on Vercel Hobby (free); the API stays on Render and lives in a **different repository** (`../paybridge/paybridge`).

**Status (2026-10-22):** planning only. There is no code yet. Read before changing anything: `intent/frontend-demo-console.intent.md`, then `spec/frontend-demo-console.spec.md`, then `plans/frontend-demo-console.plan.md` (the plan; update it in the same commit when work departs from it).

## Commands
These are planned and created in plan Step 33. **None has been run yet**, so verify each one exists before relying on it.
- Install: clean install from the lockfile
- Dev: Vite dev server
- Verify: type-check, lint, unit tests, build (all must pass; paste the output)
- E2E: Playwright against a local checkout of the back end (path is a setting)
- Contract: regenerate types from `contract/openapi.json` (the snapshot of the API's `/v3/api-docs`)

## Conventions
- TypeScript strict. Types for the API come from the generated contract; never hand-write a request or response type.
- **Money is integers in minor units.** No floating point anywhere. The server is the authority; the console only displays.
- **Every request goes through the one API client.** It sends a client-generated `X-Request-Id`, prints the endpoint in the Action Log before the call, and masks the key. No direct use of the browser's `fetch` elsewhere.
- Keys live in memory (opt-in session storage). Never in local storage, a URL, a log line, or a `VITE_` variable. The partner secret and Paystack key never reach the browser.
- Changing the Backend Address wipes the key and cached data.
- Every screen designs all states: loading, empty, error, offline, backend asleep, rate-limited (429 with wait), unauthorized.
- Design tokens live in `docs/tokens.md`; WCAG 2.2 AA; keyboard-complete; respect reduced motion.

## Architecture
Static site -> direct HTTPS calls to the Render API (CORS) -> polling for state, one fetch-stream for logs. No proxy, no Vercel functions. Details: spec section 5 and plan sections 4 and 5A.

## Things Claude gets wrong here (add to this list when a mistake happens twice)
- Using floats for money or re-calculating fees in the browser.
- Calling `fetch` directly instead of the API client.
- Polling in hidden tabs or without a stop condition.
- Fixed sleeps in tests; tests that need the real Paystack.
- Editing generated types or the contract snapshot by hand.
- Adding a dependency for a small flourish.
- Editing back-end code from this repository (Steps 29 to 32 belong to the `paybridge` repository).

## Working agreements
- Plan mode first; no code without an accepted plan. Tests first. Show test output before saying done.
- When fixing a bug, write the failing test first and do not edit it afterwards.
- Never put a secret in a commit, a log or a response. Check `.claude/skills/` before touching keys, money, the API client or UI.
