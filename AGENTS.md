# PayBridge Demo Console (paybridge-frontend)

Instructions for any AI coding agent or human contributor working in this repository. This file is the single source of agent guidance; `CLAUDE.md` only points here so tools that look for that name still find it.

A static React console that demos the PayBridge API (internal transfers, Paystack transfers, FX, remittance, settlement) with a live log pane. Deployed on Vercel Hobby (free); the API stays on Render and lives in a **different repository** (`../paybridge/paybridge`).

**Status (2026-10-22):** planning only. There is no code yet. Read before changing anything, in this order: `intent/frontend-demo-console.intent.md`, `spec/frontend-demo-console.spec.md`, `plans/frontend-demo-console.plan.md` (the plan; update it in the same commit when work departs from it).

## Commands
Planned and created in plan Step 33. **None has been run yet**, so confirm each exists before relying on it.
- Install: clean install from the lockfile
- Dev: Vite dev server
- Verify: type-check, lint, unit tests, build (all must pass; paste the output)
- E2E: Playwright against a local checkout of the back end (path is a setting)
- Contract: regenerate types from `contract/openapi.json` (snapshot of the API's `/v3/api-docs`)

## Conventions
- TypeScript strict. API types come from the generated contract; never hand-write a request or response type.
- **Money is integers in minor units.** No floating point. The server is the authority; the console only displays.
- **Every request goes through the one API client.** It sends a client-generated `X-Request-Id`, prints the endpoint in the Action Log before the call, and masks the key. No direct network calls elsewhere.
- Keys live in memory (opt-in session storage). Never in local storage, a URL, a log line, or a `VITE_` variable. The partner secret and Paystack key never reach the browser.
- Changing the Backend Address wipes the key and cached data.
- Every screen designs all states: loading, empty, error, offline, backend asleep, rate-limited (429 with wait), unauthorized.
- Design tokens in `docs/tokens.md`; WCAG 2.2 AA; keyboard-complete; respect reduced motion.

## Architecture
Static site, direct HTTPS calls to the Render API (CORS), polling for state, one fetch-stream for logs. No proxy, no Vercel functions. Details: spec section 5, plan sections 4 and 5A.

## Project rules in plain markdown (any agent can read them)
Topic rules live in `.claude/skills/<name>/SKILL.md` (security, money, API client, UI) and helper roles in `.claude/agents/*.md` (verifier, code-simplifier, researcher). The folder name is Claude Code's convention; the files are ordinary markdown. Read the relevant one before touching keys, money, the API client or UI. Review policy: `REVIEW.md`. Process and gates: `docs/ai-sdlc/`.

## Mistakes agents make here (add a line when one happens twice)
- Using floats for money or re-calculating fees in the browser.
- Calling the network directly instead of the API client.
- Polling in hidden tabs or without a stop condition.
- Fixed sleeps in tests; tests that need the real Paystack.
- Editing generated types or the contract snapshot by hand.
- Adding a dependency for a small flourish.
- Editing back-end code from this repository (plan Steps 29 to 32 belong to the `paybridge` repository).

## Working agreements
- Plan first; no code without an accepted plan. Tests first. Show real test output before saying done.
- For a bug fix, write the failing test first and do not edit it afterwards.
- Never put a secret in a commit, log or response.
- Keep this file under about a page; remove anything stale.
