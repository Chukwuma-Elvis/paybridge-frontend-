# Spec: PayBridge Demo Console

Derived from `intent/frontend-demo-console.intent.md` and `plans/frontend-demo-console.plan.md` (sections referenced as "plan s.N"). Status: **draft, awaiting product-owner sign-off.** Date: 2026-10-22.
Policies applied (as skills in `.claude/skills/`): console-security, money-and-units, api-client-contract, ui-standards.

## 1. Goal and non-goals
Goal: a static web console that demonstrates every PayBridge feature with a live log pane, using the Render API by an editable address, hosted free on Vercel. Non-goals are those in the intent's "Out of scope".

## 2. Functional requirements
| ID | Requirement | Plan reference | Acceptance (summary) |
|---|---|---|---|
| FR-1 | **Backend Address**: shown at all times, editable, validated (https required except localhost), recent list, reset to default (build-time value) | s.4, Step 34 | Changing it clears the key and cached data; invalid addresses rejected |
| FR-2 | **Wake**: button plus optional automatic wake; probes the open health endpoint with backoff; "waking" is not an error | Step 34, D9 | With a simulated sleeping server the console waits, shows elapsed time, stops on UP, cancel or the time limit |
| FR-3 | **Session**: paste admin or client key, role shown, key in memory by default | invariants 7, 13 | Key never appears in storage (unless opted in), URL, logs or the inspector |
| FR-4 | **Action Log**: every request prints `->` endpoint before sending and `<-` result after, with the request id | s.7, invariant 14 | A click shows its full endpoint within one frame, even with the server stream off |
| FR-5 | **Live server log**: stream of the API's log lines, filters, pause, follow-tail, correlation by request id, reconnect with catch-up and gap markers | s.7, Steps 30, 35 | Reconnect resumes without duplicates; a request's lines can be isolated |
| FR-6 | **Request Inspector**: method, address, status, time, request id, bodies with the key masked, copy as curl | Step 34 | No secret in any recorded text |
| FR-7 | **Customers and accounts**: create, KYC tier, limits, balance, ledger entries, notifications, dev funding when the server allows it | Step 37 | Money inputs parse and format exactly |
| FR-8 | **Internal transfers** with idempotent replay and error scenarios | Step 38 | Replay returns the same transfer |
| FR-9 | **External transfers**: beneficiary resolve and save, transfer, outcome playground (fake bank), Paystack-mode banner | Step 39 | Each outcome renders its final state |
| FR-10 | **FX**: rate, spread, manual rate and approval (admin), quote with expiry countdown, conversion | Step 40 | Displayed money equals server values exactly |
| FR-11 | **Remittance**: create, status timeline from history, partner simulator (valid, forged, repeat, wrong amount), ledger proof strip, refund path | Step 41 | Whole story from quote to PAID and to REFUNDED |
| FR-12 | **Compliance**: held remittance explanation, cases, decision with mandatory reason, limits | Step 42 | Hold-to-approval story runs |
| FR-13 | **Settlement**: position, close, batches, lines, instruct, confirm, dispute, statement upload and preview, breaks | Step 43 | Close-to-reconciled story runs |
| FR-14 | **Admin and security**: API keys, 401/403/429/forged/idempotency scenarios, health and metrics, timers explained | Step 44 | Rate-limit demo stops after the first 429 |
| FR-15 | **Guided demo** (scripted story, Say/Do/See/Under the hood) and **Explorer** (every endpoint) | Step 36 | Section 1 story (plan) completes |
| FR-16 | **Coverage**: every row of the plan's feature matrix (s.8) ticked or excepted in writing | Step 44 | Checklist signed off |

## 3. Non-functional requirements
- **Accessibility:** WCAG 2.2 AA; keyboard-complete; log updates announced as a rate-limited summary, never line by line; colour never the only signal; reduced motion honoured.
- **Performance:** route-level code splitting, virtualized log list (10,000 lines responsive), bundle budget enforced in CI (value set after Step 34 measures it).
- **Resilience:** designed states for loading, empty, error, offline, asleep, 429, 401; reads retry with backoff, writes retry only with the same idempotency key; log stream reconnects.
- **Security:** see section 6.
- **Cost:** no paid Vercel or Render feature; no Vercel functions, middleware, image optimisation, analytics, cron or proxy rewrites.
- **Privacy:** no analytics or third-party scripts at runtime.

## 4. Back-end enablers (repository `paybridge`, plan Steps 29 to 32)
| Enabler | Why | Constraint |
|---|---|---|
| CORS allow-list (+ exposed `X-Request-Id`, `Retry-After`; allowed request header `X-Request-Id`) | A browser on another address is blocked otherwise | Empty list by default; preflight answered before key check and not rate-limited |
| Log buffer and admin-only stream | The live log pane needs data | Bounded memory, off by default, no secret in any line, viewer cap |
| Partner simulator (admin, demo setting) | The browser must not hold the partner secret | Off by default; goes through the same webhook service |
| System info (admin) | The console adapts to the server's mode | Booleans only, never a secret |

## 5. Design
- **Architecture:** static site; direct HTTPS calls to Render; polling every 2 to 3 s for in-progress objects (paused in hidden tabs); one long-lived fetch-stream for logs (the browser's EventSource cannot send the key header). No proxy, no back-end-for-front-end.
- **Stack:** TypeScript strict, React, Vite, TanStack Query, a small store, generated API types, accessible unstyled primitives, virtualized list, Playwright (plan s.5).
- **Layout:** top bar (address, wake, backend status, key role), left nav, workspace, Request Inspector, resizable Live Log dock (plan s.6).
- **Hosting:** Vercel Hobby, repository root, `vercel.json` with SPA fallback, cache and security headers (plan s.5A).
- **Data:** nothing persisted server-side by the console; browser keeps the address, recent items and (opt-in) the key for the tab session.

## 6. Security and policy conformance
| Policy | How the spec conforms |
|---|---|
| Keys never leak | Memory-only by default; masked everywhere; wiped on address change; never in URL, storage (unless opted in), logs, errors or `VITE_` variables |
| Secrets stay server-side | Partner secret used only by the API's simulator; Paystack key only in the API |
| Least exposure | All new API endpoints admin-only and off by default |
| Content Security Policy | Scripts and styles same-origin only; connections to `https:` hosts and localhost (because the address is editable); report-only first, enforced after the quality pass |
| Free tier | No paid feature (plan invariant 15) |
| Money | Integer minor units end to end; display formatting only at the edge |
| Contract | Types generated from the API's OpenAPI description; stale snapshot fails CI |

## 7. Flagged areas of concern (for the product owner to resolve with the named owner)
1. **Looser connection policy.** An editable address forces `connect-src` to allow any https host, weakening a control that would otherwise pin one host. *Mitigation:* address validator, key wiped on change, scripts locked to same-origin. *Owner:* project owner (security). **Contradiction between "editable address" and "tight CSP" is accepted, not resolved.**
2. **Public production URL.** Vercel Hobby cannot password-protect the production domain. *Mitigation:* the console holds no data or key until one is pasted; unguessable project name. *Owner:* project owner.
3. **Admin key typed into a web page.** Compromise of the page would expose it. *Mitigation:* memory-only, no third-party scripts, dependency audit, strict headers. Residual risk remains; documented.
4. **Dev funding in the demo deployment.** Turning on the "print test money" endpoint contradicts the production-safe default in `render.yaml`. *Owner:* project owner; decision D3.
5. **Preview deployments and CORS.** Previews cannot be allow-listed one by one; a pattern is a security risk until the real hostname format is verified. Default: previews are UI-only.
6. **Free-tier behaviour.** 4 to 5 minute wake, no background work while asleep, database expiry after 30 days, Vercel Hobby non-commercial only.
7. **Unverified facts:** Vite preset detection and preview hostname format on Vercel; Paystack path end to end; none verified yet.
8. **Cross-repository drift.** Back-end enablers must be deployed before dependent screens are tested against the real API.

## 8. Open questions carried from the intent
Questions 1 to 7 of the intent are answered by the plan's recommendations (D1, D2, D3, D5, D12), **none confirmed by the owner yet**. Question 6 (previews) defaults to UI-only; question 7 defaults to "owner only, public URL accepted".

## 9. Definition of done
All plan steps' exit criteria met; feature matrix (plan s.8) fully ticked; deployed console completes the full story against the deployed API; tests green; accessibility audit and guidelines review recorded; honest-limits list updated; written guide added to the `paybridge` repository's `guide/` folder.
