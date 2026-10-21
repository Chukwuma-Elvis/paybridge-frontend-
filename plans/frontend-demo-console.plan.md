# Execution Plan: PayBridge Demo Console (front end with live logs)

| | |
|---|---|
| **Objective** | Build a web front end, the **PayBridge Demo Console**, that lets a person demonstrate every feature of PayBridge (internal transfers, Paystack/external transfers, FX, remittance, compliance review, settlement, API keys and security) while a **live log panel** shows what the server is doing, in real time, next to every click. |
| **Status** | **Proposed.** Nothing in this plan has been built or approved. It contains **no code**, by request. Implementation starts only when you say so. |
| **Written** | 2026-10-21 |
| **Starting point** | **Back end** (repository `paybridge`): `main` at commit `97f10d4` (Swagger added): 874 tests, migrations V1 to V19, deployed or deployable on Render free tier, `demo/demo.sh` working. **Front end** (repository `paybridge-frontend`, created 2026-10-22): empty git repository containing only this plan |
| **Numbering** | New work is **Steps 29 to 46**: back-end enablers are Steps 29 to 32, the front end is Steps 33 to 46 |
| **Repositories** | **Two.** `paybridge` (Spring Boot API, Steps 29 to 32) and `paybridge-frontend` (this repository, the console, Steps 33 to 46). Local paths: `C:\Users\CHUKWUMA\projects\paybridge\paybridge` and `C:\Users\CHUKWUMA\projects\paybridge-frontend`. The front-end GitHub repository does not exist yet (only the local one does) |
| **Format** | The `blueprint` skill: every step has a self-contained context brief, tasks, tests first, verification, exit criteria and rollback, so any session can pick up any step cold |

**Skills used, and how** (all from `C:/Users/CHUKWUMA/.gemini/config/skills/`)

| Skill | Used for |
|---|---|
| `blueprint` | The plan's shape: context brief per step, dependency graph, parallel steps, rollback, review gate, anti-patterns, mutation protocol |
| `frontend-design-direction` | The design direction in section 6: a dense, quiet, scannable operator tool, not a landing page; first screen is the working tool |
| `design-taste-frontend` | **Only its anti-default rules** (no purple gradients, no card-in-card, no three-equal-cards). Its own text says it is for landing pages and portfolios, "not dashboards", so its dials and layouts are not used |
| `design-system` | Design tokens as CSS variables, a written token list, and a consistency audit as part of the review gate |
| `emil-design-eng` | Interaction polish: when to animate (rarely), how fast, hover and press states, what must never animate |
| `pick-ui-library` | The curated library picks in section 5 (accessible primitives, toasts, streaming list, animated numbers, charts) |
| `frontend-patterns`, `react-patterns` | Component composition, state decision tree (server state vs UI state), Suspense and error boundaries, performance rules |
| `frontend-a11y`, `accessibility` | WCAG 2.2 AA: labels, error messages, keyboard, focus, live regions (important for a log that updates by itself) |
| `contract-first`, `api-design` | The front end's types come from the back end's published OpenAPI description, so the two cannot drift; error and status-code handling follow the API's own conventions |
| `dashboard-builder` | The health and metrics view starts from operator questions, not from "show every metric" |
| `react-testing` | Component tests with Vitest, Testing Library, MSW and axe, and where the boundary to end-to-end tests sits |
| `e2e-testing` | Playwright, page objects, no fixed sleeps, artifacts on failure |
| `browser-qa` | Visual and interaction check of the deployed console |
| `ui-demo` | Optional: record a polished walkthrough video of the demo (stretch step) |
| `security-review` | Rules for keys in the browser, the log stream and the new admin endpoints |
| `web-design-guidelines` | The review gate: audit the built UI against Vercel's published Web Interface Guidelines (fetched at review time) |

> **Honesty notes.** (1) I read the skills named above; I did not run the `blueprint` sub-agent adversarial review, so this plan has **not** been through that gate yet (section 12 makes it Step 29's first task). (2) Facts about the back end below were read from the source on 2026-10-21. Anything marked **VERIFY** I did not confirm. (3) Nothing here has been built, so every time and size estimate is a guess.

---

## Contents

1. [Scope and the demo story](#1-scope-and-the-demo-story)
2. [What the back end offers today, and the gaps](#2-what-the-back-end-offers-today-and-the-gaps)
3. [Project invariants](#3-project-invariants-checked-after-every-step)
4. [Architecture](#4-architecture)
5. [Technology choices](#5-technology-choices)
   - [5A. Deploying and optimizing for Vercel](#5a-deploying-and-optimizing-for-vercel)
6. [Design direction and screen map](#6-design-direction-and-screen-map)
7. [The live log panel, in detail](#7-the-live-log-panel-in-detail)
8. [Feature coverage matrix](#8-feature-coverage-matrix)
9. [The steps](#9-the-steps)
10. [Dependency graph and parallel work](#10-dependency-graph-and-parallel-work)
11. [Testing and verification](#11-testing-and-verification)
12. [Review gate](#12-review-gate)
13. [Risks and open questions](#13-risks-and-open-questions)
14. [Anti-patterns to avoid](#14-anti-patterns-to-avoid)
15. [Plan mutation protocol](#15-plan-mutation-protocol)
- [Appendix A: Decision records (proposed)](#appendix-a-decision-records-proposed)
- [Appendix B: Glossary](#appendix-b-glossary)

---

## 1. Scope and the demo story

**In scope**

* A single-page web app, served as a **static site**, talking to the existing PayBridge API over HTTPS.
* Two ways to use it: **Guided demo** (a script of steps that tells a story) and **Explorer** (every endpoint reachable from a form, for anyone who wants to poke around).
* A **Live Log dock** that is always visible: server log lines streaming in, filterable, linkable to the request that caused them.
* A **Request Inspector**: every call the console makes, with method, address, status, time, request id, and (with the key masked) request and response bodies.
* A **Backend Address** control (top bar and `/connect`): the console talks to the PayBridge service on Render by its public address, the address can be **changed in the running console at any time** (for example to point at a new Render service, a local `http://localhost:8080`, or a staging copy), and the last address used is remembered in the browser.
* A **Wake button and automatic wake-up**: the console can wake a sleeping Render service by itself (and keeps trying until it answers), with an honest progress display.
* An **Action Log** inside the log pane: **every click that causes a request prints the exact endpoint it called**, as it is sent and again when it finishes, even when the server's own log stream is off or the service is asleep.
* Back-end additions required to make the above possible and safe (Steps 29 to 32, done in the `paybridge` repository, not this one).

**Out of scope (this plan)**

* Any real customer-facing product, sign-up, or login. The console uses API keys you paste in.
* Changing business rules (fees, limits, ledger, state machine).
* Mobile-first design. It must work on a phone without breaking, but the demo is meant for a laptop or projector.
* A second language, theming beyond light and dark, offline use.

**The demo story** (this decides what the Guided demo does):

1. **Wake and connect.** The console shows the Backend Address (default: your Render service address), checks it, and if the service is asleep offers a **Wake** button (and wakes it automatically on first load if you choose). On the free tier this takes 4 to 5 minutes; the console shows elapsed time, each attempt, and the action log line for every probe instead of errors.
2. **Sign in with a key.** Paste the admin key; the console shows its role, and creates a client key for the "customer side".
3. **Internal transfer.** Create two customers and accounts, fund one, move money between them. Watch the ledger lines appear and the log lines stream.
4. **FX remittance.** Set a rate, get a quote, create a remittance, simulate the partner's signed "money arrived" message, watch the timeline walk to PAID, and see the **zero-sum ledger proof** (every currency adds to zero).
5. **External transfer.** Add a bank beneficiary, resolve the name, send a transfer. With the fake gateway, provoke every outcome using the last-four-digits rule. With Paystack test mode, send a real test-mode transfer and watch the Paystack webhook arrive in the log.
6. **Compliance.** Send a remittance from a watch-listed name, see it held, approve it as a compliance officer.
7. **Settlement.** Close a batch, instruct, upload a bank statement CSV, see matches and breaks, confirm payment, see the partner position return to zero.
8. **Security and safety.** Show a 401, a 429 with its wait time, a forged webhook refused, a repeated request answered from the idempotency record.

---

## 2. What the back end offers today, and the gaps

Read from the source on 2026-10-21. The console's data comes from these endpoints; the OpenAPI description (`/v3/api-docs`, added in the Swagger step) is the contract.

**Endpoints that exist**

| Area | Endpoints |
|---|---|
| Customers | `POST /api/customers`, `GET /api/customers/{id}`, `PATCH /api/customers/{id}/kyc-tier` |
| Accounts | `POST /api/accounts`, `GET /api/accounts/{id}`, `GET /api/accounts/by-number/{n}`, `GET /api/accounts?customerId=` |
| Ledger | `GET /api/accounts/{accountId}/entries?limit=` |
| Dev funding | `POST /api/dev/accounts/{accountId}/fund` (admin; **404 when `PAYBRIDGE_DEV_FUNDING_ENABLED=false`**, which is how `render.yaml` ships) |
| Internal transfers | `POST /api/transfers/internal`, `GET /api/transfers/{id}`, `GET /api/transfers?accountId=&limit=` |
| Beneficiaries / external | `POST /api/beneficiaries/resolve`, `POST /api/beneficiaries`, `GET /api/beneficiaries`, `POST /api/transfers/external` |
| Notifications | `GET /api/notifications?customerId=&limit=` |
| Compliance | `GET /api/compliance/customers/{id}/limits`; admin: `GET /api/admin/compliance/cases`, `GET .../cases/{id}`, `POST .../cases/{id}/decision` |
| FX | `GET /api/fx/rates/{corridor}`, `POST /api/fx/quotes`, `GET /api/fx/quotes/{id}`, `GET /api/fx/conversions/{quoteId}`; admin: `GET/POST /api/admin/fx/rates`, `POST .../rates/{id}/approve`, `POST .../refresh`, `PUT .../spread` |
| Remittance | `POST /api/remittances`, `GET /api/remittances/{id}`, `GET /api/remittances?partnerCode=&senderReference=&limit=`; admin: `GET .../{id}/history`, `POST .../{id}/review`, `POST .../process` |
| Settlement (admin) | position, close, batches, batch, lines, report, instruct, confirm, dispute, statement upload (CSV), breaks, assign, resolve |
| API keys (admin) | `POST/GET /api/admin/api-keys`, `DELETE /api/admin/api-keys/{id}` |
| Webhooks | `POST /api/webhooks/{provider}` (`paystack`, `monnify`, `partner`): signed, not key-authenticated |
| Health, metrics | `GET /actuator/health` (open), `GET /actuator/metrics` (admin) |
| Docs | `/swagger-ui.html`, `/v3/api-docs` (open when switched on) |

**Gaps that block a browser console** (each becomes a step)

| # | Gap | Why it matters | Fix |
|---|---|---|---|
| G1 | **No CORS configuration** (searched: none) | A browser on another address is blocked from calling the API | Step 29: configurable allow-list; expose `X-Request-Id`, `Retry-After` |
| G2 | **No way to read logs over HTTP** | The live log panel has nothing to read | Step 30: in-memory log buffer plus an admin-only streaming endpoint |
| G3 | **The partner's funding webhook must be signed** with a secret the browser must never hold | Without it a remittance can never reach PAID from the console | Step 31: admin-only, off-by-default "partner simulator" endpoint that signs on the server, with options for valid, forged and repeated |
| G4 | **No endpoint says which mode the server is in** (fake or Paystack gateway, dev funding on/off, partner secret set) | The console must adapt: hide or explain features that cannot work | Step 32: read-only admin "system info" endpoint, never returns secrets |
| G5 | **Dev funding is off on Render**, and an internal transfer needs a funded account | Internal-transfer demo has no starting money | Decision D3: enable it on the demo deployment (admin-only, sandbox), or fund through a remittance first |
| G6 | **No list-all endpoints** for customers or accounts | The console cannot show "everything that exists" | Console keeps its own "recent items" list in the browser; no back-end change (Decision D6) |
| G7 | The Swagger step added the OpenAPI description, but descriptions of fields are thin | Generated types are fine; generated help text is not | Console carries its own plain-English labels |

---

## 3. Project invariants (checked after every step)

Back end (unchanged, must stay true):

1. **Ledger rules untouched**: per-currency zero-sum, append-only, money as `long` minor units.
2. **Security is still deny-by-default.** The only new open addresses are none; every new endpoint is admin-only (`/api/admin/...`) and covered by `AccessPolicyTest`.
3. **No secrets in logs, responses or the browser bundle.** Bodies and headers are still never logged.
4. **All new back-end features are off by default** and enabled only by environment settings.
5. The full suite stays green; the baseline is 874 tests, 0 failures.

Front end:

6. **Money is never a floating-point number.** Amounts travel and compute as integers in minor units; formatting happens only at the edge.
7. **Keys live in memory by default**; storing one is an explicit opt-in per session, in session storage only, never local storage, never in an address.
8. **The partner secret and the Paystack secret never reach the browser.**
9. **Every screen works by keyboard**, has visible focus, and passes automated accessibility checks.
10. **Every state is designed**: loading, empty, error, offline, back-end asleep, rate-limited, unauthorized.
11. **Types come from the contract.** Hand-written request or response types are a defect.
12. **No fixed sleeps in tests**; wait for observable conditions.
13. **The Backend Address is explicit and visible.** It is always shown in the top bar. Changing it forgets the session key (a key typed for one server is never silently sent to another), clears cached server data, and requires a confirmation if the new address is not `https` (the only exception is `localhost`, `127.0.0.1` or `[::1]`).
14. **Every request the console makes is announced in the Action Log** with its full endpoint (method, address, path, query), before it is sent. No hidden calls: the wake probes, polling, the log stream's own connection and the system-info read are all shown (polling lines are collapsible so they do not drown the clicks).
15. **The console must deploy and run on Vercel's free Hobby plan with no paid feature** (section 5A.10).

---

## 4. Architecture

```
Browser (static site)                              Render (free tier)
 ┌────────────────────────────────────┐              ┌──────────────────────────────┐
 │ Console UI (React)                 │  HTTPS+CORS  │ PayBridge (Spring Boot)      │
 │  • Guided demo / Explorer          │ ───────────► │  filters: id, log, key, rate │
 │  • Request Inspector               │ ◄─────────── │  controllers → services → DB │
 │  • Live Log dock  ◄── stream ──────┼──────────────┤  NEW: log buffer + stream    │
 │  • polling for state changes       │              │  NEW: system info            │
 └────────────────────────────────────┘              │  NEW: partner simulator      │
                                                     │  timers (remittance, payout) │
                                                     └──────────────┬───────────────┘
                                                                    │ private network
                                                              Render Postgres
```

* **Two deployments.** The console is a separate static site; the API stays as is. Benefit: the console loads instantly even while the free API is asleep, and can explain the wait.
* **Real-time without new infrastructure.** Server state changes (remittance status, payouts, batches) are followed by **polling** every 2 to 3 seconds while a thing is "in progress" and paused when the tab is hidden. The **log** uses one long-lived streaming connection (Server-Sent Events style) with automatic reconnect and catch-up.
* **No server for the console to maintain.** No back-end-for-front-end layer; the only secret-bearing helper (the partner simulator) lives in the API behind the admin key (Decision D2).
* **Backend address is configuration, not code.** The default comes from a build-time setting (the Render service address, no secrets), the user can override it in the UI, and the override is stored in the browser (local storage is acceptable here because an address is not a secret). A **Reset to default** button restores the build-time value.
* **Waking Render.** Render wakes a free service when a request reaches it. The console sends light probes (the open health endpoint) on a schedule with backoff, treating gateway errors and timeouts as "still waking", not as failures, until the health answer says UP or a limit is reached (Decision D9).
* **Correlation is the demo's hero feature.** Every API call carries an `X-Request-Id` that comes back in the response; every log line carries that id. Clicking a request filters the log to exactly its lines, and clicking a log line highlights its request.

---

## 5. Technology choices

Chosen for a beginner-maintainable, demo-quality tool. Reasons in Appendix A.

| Concern | Choice | Note |
|---|---|---|
| Language / build | **TypeScript (strict)** with **Vite** | Fast dev loop, plain static output |
| UI | **React 19** | Per `react-patterns`: function components, hooks discipline, error boundaries |
| Routing | React Router (data router) | Each feature is a route, so a demo step can be linked |
| Server state | **TanStack Query** | Caching, polling intervals, retries with the right rules for 4xx vs 5xx |
| UI state | A small store (**Zustand**) | Session (keys, mode), log filters, selected entities, recent items |
| API client | **openapi-typescript** types plus a thin typed fetch wrapper | Generated from `/v3/api-docs` (contract-first) |
| Forms | React Hook Form with Zod | Mirror the server's rules (10-digit account, positive amounts) for fast feedback; the server stays the authority |
| Styling | **Tailwind CSS** with design tokens as CSS variables | `design-system`: tokens first, dark and light |
| Primitives | **Base UI** (unstyled, accessible dialogs, menus, tabs, selects) | `pick-ui-library` |
| Toasts | **Sonner** | Non-blocking confirmations |
| Long log list | **Virtuoso** (virtualized, follows the tail) | Thousands of lines without lag |
| Animated numbers | **NumberFlow** | Balances change visibly, respects reduced motion |
| Charts | **Recharts** for small metric charts | Health view only |
| Icons | One icon set (Lucide) | Familiar tool actions get icons |
| Unit/component tests | **Vitest, Testing Library, MSW, axe** | `react-testing` |
| End-to-end | **Playwright** with page objects | `e2e-testing` |
| Hosting | **Vercel** (Hobby, free) for the console; the API stays on Render | Section 5A. Render Static Site is the fallback |

---

## 5A. Deploying and optimizing for Vercel

**Decision (D12, recommended):** the console is built as a **pure static site** and deployed to **Vercel's free Hobby plan**; the PayBridge API stays on Render. The browser talks to Render **directly**; Vercel only hands out the files.

> **Free-tier rule for this whole section: nothing in the console may require a paid Vercel feature.** Every setting, header, and workflow below works on Hobby. Anything that would need Pro (password-protected previews, team seats, longer logs, higher deployment counts) is listed in 5A.10 as *not available, and what we do instead*.

### 5A.1 What was checked, and what was not

Checked against Vercel's own documentation on 2026-10-21:

| Fact | Source page |
|---|---|
| The Hobby plan is free, but "restricts users to non-commercial, personal use only". Included usage includes 100 GB fast data transfer, 1,000,000 CDN requests per month, and **100 deployments per day** | Hobby plan |
| `vercel.json` supports `rewrites`, `headers`, `redirects`, `buildCommand`, `outputDirectory`, `installCommand`, `framework`, `ignoreCommand`, `trailingSlash`, `cleanUrls` | vercel.json reference |
| Environment variable changes **do not apply to existing deployments**, only to new ones | Environment variables |
| Pushing to a non-production branch creates a **Preview Deployment**; pushing to the production branch (usually `main`) creates a Production Deployment | Environment variables |
| Deployment Protection: **Standard Protection** protects preview and deployment URLs but leaves production domains open; Vercel Authentication is available on Hobby; **Password Protection is not available on Hobby** | Deployment Protection |

**Not checked (marked VERIFY, to be confirmed in Step 46 on a real account):** that the Vite preset is auto-detected and which Node version is the default; the exact hostname pattern of preview URLs; how Vercel's "promote previous deployment" rollback is worded in the dashboard; whether external rewrites would carry a long-lived stream (we avoid depending on it, see 5A.5). If Vercel's behaviour differs from this section, the section is corrected first.

### 5A.2 Why this fits

* **Static output means no functions.** There is nothing to cold-start, nothing counted against function limits, and the whole console is served from the CDN. It loads in a second or two even while the Render API is asleep, so the wake-up screen is always available.
* **The heavy traffic bypasses Vercel.** API calls, the wake probes, and the long-lived log stream all go from the browser straight to Render. Vercel's request, data-transfer and function-duration limits therefore do not apply to them.
* **Free-plan fit.** A demo console is tiny next to the Hobby allowances. The two real limits to respect are **100 deployments per day** (section 5A.4 saves them) and **non-commercial use** (fine for a learning or assignment project; if this ever becomes a paid product, move to a plan that allows it).

### 5A.3 Project settings

| Setting | Value | Why |
|---|---|---|
| Git integration | Connect the GitHub repository for this project (`paybridge-frontend`, to be created under the same personal account as `Chukwuma-Elvis/paybridge`) | Push to `main` deploys production; other branches get previews |
| **Root Directory** | Leave at the repository root | This repository contains only the console, so no sub-folder setting is needed |
| Framework preset | Vite (VERIFY auto-detected) | Correct build and output without extra settings |
| Install | clean install from the lockfile | Reproducible builds |
| Build | the project's build script | One command, type-check included, so a type error fails the deploy |
| Output directory | `dist` | Vite's default |
| Node version | Pinned in the project (version file plus the `engines` field) and matched in the Vercel setting | Same build locally and on Vercel |
| Production branch | `main` | |
| Ignored build step | Skip the build when only documentation or plan files changed (for example everything under `plans/` and `docs/`, and `*.md`) | Saves part of the 100-deployments-per-day allowance. Back-end commits no longer matter: they happen in a different repository and never reach Vercel |

### 5A.4 `vercel.json` (to be written in Step 33; described here, not coded)

| Part | What it does | Why |
|---|---|---|
| **Single-page-app fallback rewrite** | Any path that is not a real file returns `index.html` | Deep links such as `/remittances/123` and a browser refresh must not 404 |
| **Cache headers** | Hashed asset files: cache for a year, immutable. `index.html`: always revalidate | Fast repeat loads, and a new deploy shows up immediately |
| **Security headers** | Content Security Policy, `X-Content-Type-Options`, a strict referrer policy, frame blocking, a locked-down permissions policy | Section 5A.6; the console handles a pasted admin key |
| **Ignore command** | As in 5A.3 | Saves deployments |
| **No proxy rewrites to Render** | Deliberately absent | Decision in 5A.5 |
| Clean URLs / trailing slash | Left at defaults unless a link bug shows up | Keep it simple |

### 5A.5 The Render connection (the important design point)

* **Direct, cross-origin calls, not a Vercel proxy (D12).** A proxy through Vercel rewrites would hide CORS but would: add a hop; hard-wire the back-end address into the deployment (breaking the **editable Backend Address** requirement); make a minutes-long wake-up and a held-open log stream depend on behaviour I have not verified; and tie every back-end change to a Vercel config change.
* **Default address is a build-time variable.** `VITE_DEFAULT_BACKEND_URL`, set in the Vercel project (Production: your Render service address; Preview: the same unless you run a staging API). It is **public by design** (it is shipped to every visitor). Rule: **no variable that starts with the public prefix may ever hold a secret.** The user's override in the UI wins over it.
* **Changing the default needs a redeploy** (verified above: environment changes apply to new deployments only). Changing the address at runtime in the UI needs nothing.
* **CORS on the API must allow the Vercel origin.** Production: the exact production origin (the `*.vercel.app` alias or your custom domain). Set through the allowed-origins setting added in Step 29, supplied in the Render dashboard (it is a prompt value, never committed with a real address).
* **Preview deployments get their own addresses**, which cannot be listed one by one. Options, in order of preference: (1) test previews with the API's allow-list temporarily extended; (2) support, in Step 29, an optional **strictly validated suffix pattern** for the project's own preview hostnames (https only, your project and team name in the pattern, no bare wildcards; VERIFY the real hostname format first); (3) accept that previews show the UI without a live API. Default: option 3 until you decide, because a wrong pattern is a security hole.
* **Previews are protected by default** (Standard Protection, Vercel Authentication), so only signed-in team members can open them. **The production domain is public**: anyone who knows it can open the console. That is acceptable only because the console holds no data and no keys until someone pastes one (risk R4).

### 5A.6 Content Security Policy

The editable Backend Address means the console cannot know every host it will call. Policy decision:

* **Scripts and styles: same-origin only** (no third-party scripts at runtime, no inline scripts; fonts are self-hosted). This is the part that protects a pasted admin key from injected code.
* **Network connections: same-origin, any `https:` host, plus `http://localhost`, `127.0.0.1` and `[::1]`.** This is looser than listing one host, but it is the price of an editable address. The address validator (invariant 13) is the second line of defence.
* Frames: none. Forms: same-origin. Object/embed: none. Base URI: same-origin.
* Report-only first, enforced after the quality pass (Step 45), because a too-strict policy fails silently in production.

### 5A.7 Performance and size (the "optimize" part)

| Technique | Detail | Target (to be measured, not promised) |
|---|---|---|
| Route-level code splitting | One chunk per route; the log dock and the heavy table/chart code load on demand | Initial script small enough to show the shell on a throttled mobile connection within a few seconds |
| Self-hosted, subset fonts with preload | Two families, only the weights used, `font-display` swap | No layout shift, no third-party font request |
| Tree-shaken icons and libraries | Import by name; no whole icon sets | Bundle report checked each release |
| Bundle budget in CI | The build fails if the initial JavaScript exceeds a budget set after Step 34 measures it | Prevents slow creep |
| Virtualized log list | Only visible lines are rendered | Thousands of lines with no lag (Step 35 test) |
| No images on the critical path | Interface is text and vector icons | Nothing to optimize |
| Compression | Provided by Vercel's CDN | Nothing to configure |
| No analytics scripts | Vercel Web Analytics and Speed Insights stay **off** | Privacy, fewer third-party calls, limits untouched |
| Lighthouse pass | Performance, accessibility, best practices on the deployed production URL | Result recorded in the guide; targets set after the first measurement |

### 5A.8 Deployment flow and checks

1. Step 29 sets the API's allowed origin to the Vercel production address (placeholder until the address exists, then updated in the Render dashboard and redeployed, about 4 to 5 minutes).
2. Create the Vercel project from the repository with the settings in 5A.3; add `VITE_DEFAULT_BACKEND_URL`.
3. First production deploy from `main`. Check: the shell loads; deep link and refresh work; response headers show the cache and security headers; the Backend Address shows the Render default; **Wake** works against a sleeping service; a call from the page succeeds (CORS), including the `X-Request-Id` echo and the log stream.
4. Run the Playwright smoke test and the `browser-qa` pass against the production URL.
5. **Rollback:** promote the previous deployment in the Vercel dashboard (VERIFY wording); no database or API effect, because the console is stateless.

### 5A.9 Vercel-specific risks

| # | Risk | Mitigation |
|---|---|---|
| V1 | Builds burn the 100-per-day deployment allowance | Ignored build step for documentation-only pushes; batch pushes; the back-end repository cannot trigger builds |
| V2 | Hobby is non-commercial only | Fine for this project; revisit if it becomes commercial |
| V3 | Preview URLs fail CORS | 5A.5 option 3 by default; pattern only after VERIFY |
| V4 | Public production URL | Console holds nothing until a key is pasted; consider an unguessable project name |
| V5 | Looser connection policy because the address is editable | Address validator, key wiped on address change, scripts locked to same-origin |
| V6 | Stale default address after Render is recreated | Editable address plus Reset; update the variable and redeploy |
| V7 | Free usage limit reached (Vercel pauses the feature for up to 30 days) | Budget in 5A.10; the console uses almost none of it |
| V8 | A repository owned by an organisation may not deploy on Hobby | Your back-end repository is under a personal account (`Chukwuma-Elvis/paybridge`); create `paybridge-frontend` under the same account; if either moves to an organisation, VERIFY before relying on Hobby |

### 5A.10 The Hobby (free) budget, and what is not available

**Allowances (from Vercel's Hobby plan page) against what this console will use**

| Resource | Hobby allowance | Expected use | Verdict |
|---|---|---|---|
| CDN requests | 1,000,000 per month | A few thousand even with heavy demoing (each page load is tens of files) | Far inside |
| Fast data transfer | 100 GB per month | Bundle target well under 1 MB per first load | Far inside |
| Deployments | **100 per day** | One per push to `main` of this repository; the ignored build step skips documentation-only pushes | Inside if pushes are batched |
| Function invocations, active CPU, memory | 1,000,000 / 4 CPU-hours / 360 GB-hours | **Zero**: static site, no functions | Not used |
| Image transformations | 5,000 | **Zero**: no images | Not used |
| Build | 2 vCPUs, 8 GB memory, 32 GB disk | A Vite build is small | Inside |
| Projects, domains | 200 / 50 per project | One project, one domain | Inside |

If a limit were ever exceeded, Vercel says the feature is unavailable until **30 days** have passed, so the plan stays well away from every limit instead of relying on upgrades.

**Not available on Hobby, and what we do instead**

| Paid feature | Consequence | Our answer |
|---|---|---|
| Password-protected deployments | The production URL cannot be put behind a password | The console is harmless until a key is pasted (R4); use an unguessable project name; previews are already protected by Vercel Authentication |
| Team collaboration, extra seats | Only the account owner deploys | Fine for one developer; no review workflow inside Vercel (use GitHub) |
| Runtime logs longer than 1 hour | Nothing to see: a static site produces no runtime logs | Use the console's own Action Log and Render's logs |
| More deployments per day, longer builds | See budget | Ignored build step; batch pushes |
| Spend management, drains, advanced WAF rules | Not needed | The WAF's free rules and default DDoS protection are enough for a demo |
| Commercial use | **Not allowed** on Hobby | Learning and assignment project only; move to a paid plan before any commercial use |

**Features deliberately left switched off so nothing can run up usage or hit a paid wall:** Vercel Functions and middleware, image optimization, Web Analytics, Speed Insights, cron jobs, edge configuration, and proxy rewrites to Render.

**Free-tier verification checklist (Step 46)**

1. Dashboard shows the project on the Hobby plan and the usage page shows the CDN and transfer numbers near zero after a day of demoing.
2. No function or middleware appears in the deployment's build output.
3. A push to the `paybridge` (back-end) repository does **not** start a Vercel build (different repository), and a push here that changes only documentation does not either.
4. A push to `main` of this repository produces exactly one production deployment.
5. Preview URLs ask for a Vercel sign-in (protection on) and the production URL opens without one.

---

## 6. Design direction and screen map

**Design read** (per `frontend-design-direction`): *an operator and demo tool for developers and stakeholders, dense but calm, scannable at projector distance, technical in tone.* Not marketing. The first screen is the working console, never a hero banner.

* **Tone:** utilitarian-refined. Neutral surfaces, one accent for primary actions, **semantic colours reserved for status** (success, pending, failed, held). Palette must not collapse into one hue; status colours are never the only signal (text or icon always accompanies colour).
* **Type:** one sans for interface, one mono for ids, amounts, logs and JSON. Tabular figures for money.
* **Motion:** minimal and functional (`emil-design-eng`): state changes fade or slide in quickly; the status timeline advances with a short transition; log lines do not animate; everything respects reduced motion.
* **Memorable detail:** the **correlation highlight** (pick a request, its log lines light up) and the **ledger proof strip** (debits equal credits, per currency, shown as a balanced bar).
* **Density:** compact tables, 14px base, generous touch targets only where a finger is likely (mobile layout).

**Layout**

```
┌─ Top bar: PayBridge Console │ Backend: ● awake (gateway: fake) │ Key: ADMIN ▾ │ Guided ⇄ Explorer ─┐
├───────────────┬───────────────────────────────────────────────────────┬──────────────────────────┤
│ Left nav      │ Workspace (the current scenario or form)              │ Request Inspector         │
│ Guided steps  │                                                       │ (last calls, click one)   │
│  1 Connect    │                                                       │                           │
│  2 Internal   ├───────────────────────────────────────────────────────┴──────────────────────────┤
│  3 FX/Remit   │ LIVE LOG dock (resizable, pinnable to the right) : level filter, search, request │
│  4 External   │ id filter, pause/resume, follow tail, copy, download, clear view                  │
│  ...          │                                                                                   │
└───────────────┴───────────────────────────────────────────────────────────────────────────────────┘
```

**Screens (routes)**

| Route | Purpose |
|---|---|
| `/connect` | **Backend Address** (editable, validated, history of recent addresses, reset to default), **Wake** button with progress, paste key, role shown, system info (mode, flags) |
| `/guided/:step` | The scripted demo, one step per screen, with "do it for me" and "what just happened" explanations |
| `/customers`, `/accounts/:id` | Create customers, open accounts, KYC tier, limits, balance, ledger entries, notifications |
| `/transfers/internal` | Internal transfer form, result, ledger delta, replay with the same idempotency key |
| `/transfers/external` | Beneficiary resolve and save, external transfer, outcome playground (fake gateway) or Paystack mode banner, payout status |
| `/fx` | Rate, spread, manual rate and approval (admin), quote with countdown, conversion |
| `/remittances`, `/remittances/:id` | Create, status timeline with history, partner simulator, ledger proof, payout |
| `/compliance` | Cases list and decision (admin), limits per customer |
| `/settlement` | Partner position, close batch, batch detail and lines, instruct, statement upload, breaks, confirm, dispute |
| `/admin/keys`, `/admin/security` | API keys (create, list, revoke), role demonstration, rate-limit and forged-webhook demos |
| `/ops` | Health and metrics (operator questions), request counters, background timers explained |

**Small-screen behaviour:** nav collapses to a menu, the log dock becomes a bottom sheet, the inspector becomes a tab.

---

## 7. The live log panel, in detail

**What it shows**

Each line: time, level, short logger name, request id (as a clickable chip), message. Lines for requests the console made are marked "yours". Background timers' lines (dispatcher, reconciler, remittance processor, settlement closer) show their job ids and are tagged "background".

**Controls:** pause and resume (the buffer keeps filling while paused and a counter shows how many are waiting), follow-tail toggle, level filter, text search, "only this request", "only mine", "hide health checks" (default on), copy line, download as a text file, clear (view only), font size.

**The Action Log (client-side lines, merged into the same pane)**

* **What it prints.** For every click or automatic action that makes a request, two lines: one when it is sent, `→ POST https://<your-service>.onrender.com/api/remittances` (full path and query string, the request id, and a label such as "Create remittance"), and one when it finishes, `← 201 Created (312 ms)` with the request id, or the error kind (timeout, network, 401, 429 with wait time). The key is never printed; bodies are hidden by default (a toggle shows them with sensitive fields masked).
* **Why it matters.** It answers "what did that click actually call?" for the audience, and keeps the pane useful when the server's own stream is switched off, still waking, or dropped.
* **Same pane, one timeline.** Action lines (source: "console") and server lines (source: "server") are interleaved by time. The console **creates the request id itself** and sends it in the `X-Request-Id` header (the back end accepts a client-supplied id of letters, digits, `.`, `_`, `-` up to 64 characters, otherwise it makes its own). The "sent" line therefore already carries the id the server's lines will carry, so the two halves join even if the response never comes back. Step 29 must allow that header through CORS.
* **Wake probes** appear as `→ GET <address>/actuator/health` with attempt number and result (`502`, `timeout`, `503 starting`, `200 UP`).
* **Filters** include a "console / server / both" switch and "hide polling" (default on, with a counter of hidden lines). Action lines are never dropped by the buffer cap while a click is in progress.
* **Clicks that make no request** (navigation, filters) are not logged; only requests are.

**How it works (design)**

1. **Server side (Step 30):** a custom appender in the existing logging framework copies each formatted event into a **bounded in-memory ring buffer** (about 2,000 lines, oldest dropped). Each line gets an increasing sequence number.
2. **Two admin-only endpoints:** a "recent lines" read for first load and catch-up, and a **streaming** endpoint that sends new lines as they happen, plus a periodic keep-alive.
3. **Reconnect and catch-up:** the console remembers the last sequence number it saw; after any disconnect (including the free tier sleeping and waking) it reconnects and asks for everything after that number. If the buffer has since wrapped it shows a visible "gap" marker rather than pretending nothing was missed.
4. **Authentication:** the browser's built-in event-source object cannot send the `X-API-Key` header. The console therefore reads the stream with the fetch API's streaming reader, which can (Decision D4). The key never goes in the address.
5. **Limits:** a maximum number of concurrent viewers (for example 5), each stream counted by the rate limiter once on connect, not per line; a cap on line length; a cap on the buffer. The free tier's 0.1 CPU is respected: no per-line work beyond formatting, and no streaming when nobody is watching.
6. **Safety:** log lines already exclude bodies and headers (existing rule). A test must prove that the API key, partner secret, Paystack key, and a representative body field never appear in a streamed line. The endpoint is admin-only and also off unless switched on by a setting (default off).
7. **Not a substitute for Render's own logs:** the buffer is memory only, resets on restart, and holds only recent lines. This is stated in the UI.

**Honest limits:** the stream shows what **this one running instance** logged since it started. After the service sleeps and wakes, earlier lines are gone.

---

## 8. Feature coverage matrix

"All features of PayBridge" is checked against this table in Step 44 and nothing may be left unticked without a written reason.

| Feature | Screen | Needs key | Notes |
|---|---|---|---|
| Create customer, view, KYC tier change | `/customers` | client / admin (KYC: see **VERIFY** below) | Validation messages shown inline |
| Open account, list by customer, lookup by number | `/customers`, `/accounts/:id` | client | |
| Balance and ledger entries, notifications | `/accounts/:id` | client | Entries newest first |
| Transaction limits (USD limit service) | `/accounts/:id`, `/compliance` | client | |
| Dev funding | `/accounts/:id` | admin | Hidden or explained when the server says it is off |
| Internal transfer, idempotent replay, list, get | `/transfers/internal` | client | Insufficient funds and same-account errors demonstrated |
| Beneficiary resolve, save, list | `/transfers/external` | client | |
| External transfer, status, outcome playground | `/transfers/external` | client | Last-four-digit rule table for the fake gateway |
| Paystack mode | `/transfers/external`, `/connect` | n/a | Banner from system info; webhook visible in the log |
| FX rate view, manual rate, approve, refresh, spread | `/fx` | client / admin | |
| Quote, expiry countdown, single use, conversion | `/fx` | client | |
| Remittance create, get, list by sender, history | `/remittances` | client / admin | Idempotent replay shown |
| Partner funding webhook (valid, forged, repeated) | `/remittances/:id`, `/admin/security` | admin | Through the partner simulator (Step 31) |
| Compliance hold, cases, decision, review | `/compliance`, `/remittances/:id` | admin | |
| Manual processing trigger | `/remittances/:id` | admin | `POST /api/admin/remittances/process` |
| Settlement: position, close, batches, lines, report | `/settlement` | admin | |
| Settlement: instruct, confirm, dispute | `/settlement` | admin | |
| Settlement: statement upload, matching, breaks, assign, resolve | `/settlement` | admin | CSV upload; sample file provided |
| API keys: create, list, revoke; role difference | `/admin/keys` | admin | Key shown once, copy button |
| 401, 403, 429 behaviour; rate limits | `/admin/security` | any | Shows `Retry-After` countdown |
| Request id, correlation | everywhere | n/a | Inspector and log dock |
| Health, metrics | `/ops` | open / admin | Liveness, readiness, key counters |
| Background timers | `/ops` | admin | Explains each timer and its interval (from the architecture guide) |
| Swagger link | top bar | n/a | Opens `/swagger-ui.html` |

**VERIFY (Step 33):** who may change a KYC tier (client or admin); the full body for statement upload and its expected columns; the list parameters for `/api/admin/compliance/cases`; the fields of `RemittanceView`, `Quote` and settlement views. All of these are read from the generated contract and the source before screens are built.

---

## 9. The steps

Conventions: **Tests first.** Each step lists *Context*, *Tasks*, *Verify*, *Exit criteria*, *Rollback*. Steps 29 to 32 change the Spring Boot project in the **`paybridge`** repository; Steps 33 to 46 happen in the **`paybridge-frontend`** repository (this one). Every step heading carries a repository tag. Model tier: strongest model for the steps marked ★ (security-sensitive or design-critical), default for the rest.

**Two repositories: who does what, in what order**

| | `paybridge` (back end) | `paybridge-frontend` (this repository) |
|---|---|---|
| Steps | 29 CORS and contract, 30 log stream, 31 partner simulator, 32 system info | 33 to 46 |
| Contains | Spring Boot API, Dockerfile, `render.yaml`, existing `guide/` folder | The console, `vercel.json`, tests, this plan |
| Deploys to | Render (existing blueprint) | Vercel (section 5A) |
| Tests | Maven suite (874 now) | Vitest, Playwright |
| Link between them | Publishes the OpenAPI description and the CORS allow-list setting | Reads the OpenAPI description (committed snapshot under `contract/`) and calls the deployed API |

Rules for working across the two:

1. **Back-end enablers land and are deployed first.** A console screen that needs an enabler (log stream, simulator, system info) is not started against the real API until that enabler is merged and deployed on Render; until then it is built against a recorded mock. Step 33 and Step 34 only need Step 29's contract snapshot.
2. **The contract is the only coupling.** The console never reads back-end source. When a back-end change alters the OpenAPI description, the front end re-runs its "regenerate contract" script and fixes any type error before the next release.
3. **The CORS allow-list entry is set in the Render dashboard**, not in either repository, so the real Vercel address never has to be committed.
4. **Commits and pushes stay separate**: each repository has its own history, its own CI and its own branch protection.
5. **Cross-repository documentation:** the written guide for the console goes in the `paybridge` repository's `guide/` folder (where the reading order lives); this repository holds the plan, a README, and `docs/`.


### Step 29 ★ Back end: CORS and the contract  [repo: paybridge]

* **Context.** A browser on another address cannot call the API without CORS. The front end also needs the response header `X-Request-Id` (and `Retry-After` on 429) to be readable by scripts, which browsers only allow if exposed.
* **Tasks.** (1) Run the review gate (section 12) on this plan. (2) Add a configurable list of allowed origins (empty by default, meaning no cross-origin access, so nothing changes for existing users). (3) Allow the methods and request headers the console needs (`X-API-Key`, `Idempotency-Key`, `Content-Type`, the partner signature header is **not** needed from a browser). (4) Expose `X-Request-Id` and `Retry-After`. (5) Make sure the CORS preflight is answered **before** the API-key filter (a preflight carries no key) and is not counted by the rate limiter or the failed-key limiter. (6) Add the setting to `render.yaml` and `render.paid.yaml` as a prompt value. (7) Confirm `/v3/api-docs` is the contract source and capture a snapshot of it for the front end to generate types from. (9) Support, behind a separate off-by-default setting, an optional strictly validated hostname-suffix pattern for Vercel preview deployments (section 5A.5 option 2; do not implement until the preview hostname format is verified). (8) Allow the **request** header `X-Request-Id` so the console can send its own id, and verify the server still rejects ids that do not match its safe pattern by replacing them.
* **Tests first.** Allowed origin gets the headers; a different origin gets none; a preflight without a key returns success; a real call without a key still returns 401 with the CORS headers present (so the browser can read the 401); the limiter does not count preflights; empty setting keeps current behaviour.
* **Verify.** Full suite; a manual cross-origin call from a local page.
* **Exit.** Suite green, new tests present, security invariants (3, 2) hold.
* **Rollback.** Revert the commit; empty allow-list is already the safe default.

### Step 30 ★ Back end: log buffer and live stream  [repo: paybridge]

* **Context.** Section 7. The project logs through Log4j 2 (see `AccessLogFilter`, `RequestIdFilter`).
* **Tasks.** (1) A bounded ring buffer of formatted log lines with sequence numbers, thread-safe, no allocation spikes. (2) An appender feeding it, active only when switched on by setting. (3) Admin-only endpoints: recent lines (with "after sequence" and level filters) and the stream (with keep-alive and a cap on concurrent viewers). (4) Line structure: sequence, time, level, logger, thread, request id (may be empty), message. (5) Redaction safety net: a final scrub that masks anything shaped like a key in a message, as defence in depth. (6) Make sure the stream request itself is not logged once per line and that its start and end are logged once. (7) Document memory use of the buffer.
* **Tests first.** Buffer keeps only the newest N; sequence numbers strictly increase; "after N" returns only newer lines; a line logged by a request carries that request's id; **no secret ever appears** (a test logs a request carrying an API key, a webhook body, and a Paystack key and asserts none are present); non-admin gets 403; with the setting off, the endpoints are 404; too many viewers get 429; client disconnect frees the slot.
* **Verify.** Full suite; run locally, `curl` the stream, make a request, see its lines.
* **Exit.** Suite green; memory of buffer bounded and documented; defaults off.
* **Rollback.** Setting off, or revert.

### Step 31 ★ Back end: partner simulator (signed funding on the server)  [repo: paybridge]

* **Context.** Remittances reach FUNDED only through a signed partner webhook (`PartnerFundingHandler`). The secret must not be in the browser, so a demo-only admin endpoint builds and signs the event with the configured secret and passes it through the **same** webhook service the real route uses.
* **Tasks.** (1) Admin-only endpoint, **disabled unless a demo setting is on**, taking a remittance reference, an amount, and a *mode*: `valid`, `forged` (deliberately bad signature, expected 401), `repeat` (same event id again, expected DUPLICATE), `wrong-amount`. (2) Returns the same acknowledgement the real endpoint returns, plus which mode ran. (3) Refuses if the partner secret is not configured and says so plainly. (4) Event ids are generated unless supplied.
* **Tests first.** Valid mode reaches FUNDED through the real handler; forged is refused with 401; repeat gives DUPLICATE; wrong amount is not applied; disabled gives 404; client key gets 403; missing secret gives a clear error.
* **Verify.** Full suite; run `demo/demo.sh` unchanged to prove the real route is untouched.
* **Exit.** Suite green, the real webhook route unchanged, defaults off.
* **Rollback.** Setting off, or revert.

### Step 32 Back end: system info  [repo: paybridge]

* **Context.** The console must adapt to the server (gateway fake or Paystack, dev funding, simulator, log stream, Swagger on, partner secret present).
* **Tasks.** Admin-only read endpoint returning booleans and short labels only: gateway mode, active profile, application version, flags (dev funding, simulator, log stream, docs), partner-secret-configured (true or false, never the value), configured rate limits, server time. Optionally an *open* minimal "ping" for the wake-up screen (just "up"; health already exists, so prefer reusing health).
* **Tests first.** Shape test; a test that scans the response for any configured secret value and fails if found; client key gets 403.
* **Exit.** Suite green.
* **Rollback.** Revert.

### Step 33 Front end: contract capture and scaffold  [repo: paybridge-frontend]

* **Context.** The repository root of `paybridge-frontend` (a separate repository from the Spring Boot project, with its own build, CI and deployment). Only this plan exists so far.
* **Tasks.** (1) Scaffold Vite, React, strict TypeScript, linting, formatting. (2) Download the OpenAPI snapshot from the running `paybridge` API (`/v3/api-docs`, which exists once the Swagger settings are on) and commit it under `contract/`, generate types, add a "regenerate" script and a check that fails CI if the snapshot is stale. (3) Resolve the **VERIFY** items in section 8 from the contract and source; write the findings at the top of the Step 34 brief. (4) Environment configuration for the API address, with no secrets. (5) Repository hygiene: a README that explains the console and how to run it, a `.gitignore` (dependencies, build output, environment files, editor files), editor settings, a CI workflow (type-check, lint, test, build, bundle budget), and a first commit. No change is needed in the back-end repository's `.dockerignore`. (5a) Write `vercel.json` and the Node version pin as described in section 5A.3 and 5A.4, and a bundle-budget check in CI. (6) Write the design tokens (colours, spacing, type scale, radii, elevation, motion durations) as a documented list in `docs/tokens.md` before any component.
* **Tests first.** A smoke test that renders the shell; a test that the generated types compile against a recorded sample response.
* **Exit.** `build`, `lint`, `test` all pass in a clean checkout.
* **Rollback.** Revert the commits; the back-end repository is unaffected.

### Step 34 ★ Front end: shell, session, API client, inspector  [repo: paybridge-frontend]

* **Context.** The base every screen sits on.
* **Tasks.** (1) App shell per section 6 (top bar, nav, workspace, dock placeholder, inspector). (2) **Session store**: base address, key, role, mode, with the rules in invariant 7 (memory by default; opt-in session storage). (3) **API client**: typed, adds `X-API-Key` and an `Idempotency-Key` where the API needs one, reads `X-Request-Id`, parses the problem-style error body into one error type, maps 401, 403, 404, 409, 429 (with `Retry-After`), 5xx and network failure to distinct, designed states. (4) **Retry rules**: never retry a request that may have moved money unless the same idempotency key is reused; reads retry with backoff. (5) **Request Inspector**: every call recorded (method, address, status, duration, request id, bodies with the key masked, copy as curl with the key replaced by a placeholder). (6) **Backend status**: probe health, show asleep, waking (elapsed timer, honest "about 4 to 5 minutes on the free tier"), awake. (7) Error boundary and a global "something broke" screen that shows the request id.
  * **Added by the edit of 2026-10-21 (Backend Address, Wake, Action Log):** (8) **Backend Address store**: default from build-time setting; user override saved in the browser with a short history; validation (must parse as an address, `https` required except for localhost with a visible warning otherwise, trailing slash removed, no credentials in the address); changing it clears the session key and cached data (invariant 13) and re-probes. (9) **Wake service**: a function that probes the open health endpoint with exponential backoff (for example 2 s growing to 15 s), treats network errors, timeouts and gateway errors (502, 503, 504) as "waking", stops on a health answer of UP, on user cancel, or after a limit (default 10 minutes), and reports elapsed time and attempt count. A **Wake** button in the top bar and on `/connect`; an option "wake automatically when I open the console" (default on for the Render default address only). (10) **Action Log source**: the API client generates a request id per call, emits a "sent" event before the call and a "finished" event after, and every feature goes through this single client so no call can bypass it (a lint rule bans direct use of the browser's fetch outside the client and the stream reader).
* **Tests first.** Error mapping table; masking (the key never appears in any recorded text); idempotency key reuse on retry; a 429 yields a countdown; wake-up state machine. Address validation (accepts https and localhost, rejects other http, credentials, garbage); changing the address wipes the key and cache; wake service treats 502/503/504/timeouts as waking, stops on UP, cancel and limit, and uses backoff (with a fake clock); every API call produces a "sent" and a "finished" action event with the same request id; no event ever contains the key; the client-generated id appears in the request header.
* **Exit.** Shell usable against a running back end; tests green; accessibility check clean on the shell.
* **Rollback.** Revert.

### Step 35 ★ Front end: Live Log dock  [repo: paybridge-frontend]

* **Context.** Section 7; depends on Step 30 for real data, can be built against a mock stream first.
* **Tasks.** (1) Streaming reader with reconnect, backoff, catch-up by sequence number, gap marker. (2) Virtualized list that follows the tail and stops following when the user scrolls up (with a "jump to latest" button). (3) Controls listed in section 7. (4) Request-id chips linking to the inspector and back (the correlation highlight). (5) Pause with a waiting-lines counter. (6) Level colours plus text labels. (7) Live region for screen readers that announces only a rate-limited summary ("12 new lines, 1 warning"), never every line. (8) Dock layouts: bottom, right, hidden; remembered size. (9) Download and copy.
  * **Added by the edit of 2026-10-21:** (10) Render **Action Log** lines from the client's event stream in the same virtualized list as server lines, with a source badge, a "console / server / both" switch, collapsible polling lines, and each "sent" line showing the full endpoint as a monospace, selectable, copyable address. (11) Joining: a "sent" line and its "finished" line and all server lines with the same request id form a group that highlights together. (12) Works with the server stream unavailable: the pane then shows only console lines and a visible note "server log stream unavailable (asleep, off, or not admin)".
* **Tests first.** Reconnect resumes without duplicates; a wrapped buffer produces a gap marker; pause holds lines and resume releases them in order; filters combine correctly; 10,000 lines stay responsive (a performance test with a threshold).
* **Exit.** With the real stream, a request made from the console lights its log lines; paused and resumed correctly; passes accessibility checks. Clicking any button prints its endpoint in the pane within one frame, before the response arrives; with the server stream disabled the pane still shows every request the console makes.
* **Rollback.** Hide the dock behind a flag.

### Step 36 Front end: connect screen and guided-demo framework  [repo: paybridge-frontend]

* **Tasks.** `/connect` (**Backend Address** field with Save, Reset to default and recent addresses; **Wake** button and progress; key paste; role; system info; feature availability); the Guided demo framework (ordered steps, each with *Say*, *Do* (button that performs the call and shows its endpoint), *See* (what changes), *Under the hood* (the architecture guide's explanation); progress saved for the session; "reset demo data" that only forgets the console's recent items (it cannot delete server data). The first guided step is "Connect and wake": it shows the address, wakes the service, and ends when health answers UP.
* **Tests first.** Step navigation; unavailable features are explained, not hidden silently.
* **Exit.** Steps 1 and 2 of the story run end to end.

### Step 37 Front end: customers, accounts, ledger, funding  [repo: paybridge-frontend]

* **Tasks.** Create customer and account, KYC tier change, limits, balance (animated), ledger entries table with running view, notifications, dev-funding button (only when the server says it is on), "recent items" list in the browser (G6).
* **Tests first.** Money input parsing (decimal point, thousands separator, too many decimals, huge numbers, negative), formatting round-trips, validation messages tied to fields.
* **Exit.** Can create two funded accounts without leaving the console.

### Step 38 Front end: internal transfers  [repo: paybridge-frontend]

* **Tasks.** Form with destination lookup by account number (shows owner name masked as the API returns it), amount, narration; result card with transfer id, status and ledger delta (both accounts before and after); **replay the same request** button showing an identical response (idempotency); error demos (insufficient funds, same account, unknown account) as one-click scenarios; transfer list.
* **Tests first.** Double-submit protection; replay yields the same transfer; errors map to field messages.
* **Exit.** Guided step "Internal transfer" complete with log correlation visible.

### Step 39 ★ Front end: external transfers and Paystack  [repo: paybridge-frontend]

* **Tasks.** Beneficiary resolve (name enquiry result shown), save, list; external transfer form; payout status that follows the transfer through its states with polling; **Outcome playground** (fake gateway only): a table of the last-four-digit rules with a button per outcome that fills a matching account number; **Paystack mode**: banner with the dashboard settings that must be on (turn off transfer OTP, webhook address), and a note that Paystack test mode always succeeds; the webhook arrival is highlighted in the log; reversed and failed payouts show the refund in the ledger delta.
* **Tests first.** Each outcome renders a correct final state (using recorded fixtures); mode switch changes the screen; polling stops at a final state and when the tab is hidden.
* **Exit.** Both modes demonstrable; Paystack mode **VERIFY** manually against the real sandbox, since automated tests cannot reach it.

### Step 40 Front end: FX  [repo: paybridge-frontend]

* **Tasks.** Current rate with age and source, spread (admin), manual rate and approval (admin), refresh; quote form with a live **expiry countdown**, the full breakdown (sell, fee, rate, buy), "quote used once" demonstration; conversion lookup.
* **Tests first.** Rounding display matches server values exactly (no client re-calculation of money; display only); countdown reaches expiry and disables the action; expired-quote error handled.
* **Exit.** Quote to remittance hand-off works.

### Step 41 ★ Front end: remittances and the ledger proof  [repo: paybridge-frontend]

* **Tasks.** Create form (partner, references, sender, recipient types PayBridge account or bank); **status timeline** drawing the state machine (CREATED, SCREENING, AWAITING_FUNDING, UNDER_REVIEW, FUNDED, CONVERTED, PAYOUT_PENDING, PAID, REFUND_PENDING, REFUNDED, FAILED, CANCELLED) with the current state, history reasons from the admin history endpoint, and timestamps; **partner simulator panel** (valid, forged, repeat, wrong amount) with the acknowledgement shown; **ledger proof strip** that sums the ledger lines of the remittance by currency and shows zero; payout and refund branches; manual process button (admin).
* **Tests first.** Timeline renders every state from fixtures; polling cadence and stop; simulator results mapped; proof strip arithmetic done with integers.
* **Exit.** Whole remittance story runs in Guided mode from quote to PAID, and the refund story (recipient number ending 1111) to REFUNDED.

### Step 42 Front end: compliance  [repo: paybridge-frontend]

* **Tasks.** Held remittance explanation (why: name similarity score and list entry as the API returns), cases list and detail, decision form with mandatory written reason, limits panel; the watch-list demo name offered as a one-click sample.
* **Tests first.** Reason required; decision updates the timeline.
* **Exit.** Hold to approval story runs.

### Step 43 Front end: settlement  [repo: paybridge-frontend]

* **Tasks.** Partner position, close batch, batch list and detail with lines and the report, instruct, confirm, dispute; **statement upload** (file picker and drag-drop, a sample CSV downloadable, preview of the first rows before sending), matching result, **breaks** list with assign and resolve; clear display of what "RECONCILED" requires.
* **Tests first.** CSV preview parsing; upload errors; state-dependent buttons (only valid actions enabled).
* **Exit.** Close to reconciled story runs; position returns to zero.

### Step 44 Front end: admin, security, operations  [repo: paybridge-frontend]

* **Tasks.** API keys (create with one-time reveal and copy, list, revoke; role difference demonstration); `/admin/security` scenario buttons: call without a key (401), with a client key on an admin endpoint (403), burst to trigger 429 and show the wait, forged webhook (via simulator), idempotency replay; `/ops`: health groups, key metrics chosen from operator questions (is it healthy, is it busy, is anything failing, is anything stuck), explanations of background timers; coverage check against section 8.
* **Tests first.** Rate-limit scenario stops after the first 429 (it must not hammer the server); key is revealed once and never stored.
* **Exit.** Every row of the coverage matrix is ticked or has a written exception.

### Step 45 Front end: quality pass  [repo: paybridge-frontend]

* **Tasks.** Accessibility audit (keyboard walk of every route, screen-reader pass on the log dock and forms, contrast, reduced motion, zoom to 200 percent); responsive pass (phone, tablet, projector); performance (bundle budget, route-level code splitting, no needless re-renders in the log); security review (key handling, content security policy, no secrets in the bundle, dependency audit); design-system consistency audit; `web-design-guidelines` review; copy review (plain language, no jargon without a tooltip).
* **Exit.** All checks documented, defects fixed or logged with a reason.

### Step 46 Tests, deploy, and guide  [repo: paybridge-frontend]

* **Tasks.** (1) Playwright end-to-end suite against a real local back end (a checkout of the `paybridge` repository built and run with its own Docker setup and a local database, fake gateway; the path to that checkout is a setting, because the two repositories are separate), covering each story in section 1; flaky-test rules from `e2e-testing`. (2) Vercel deployment per section 5A (project settings, `VITE_DEFAULT_BACKEND_URL`, headers, ignored build step), plus the API's allowed origin set to the Vercel production address in the Render dashboard; document both settings. Fallback if Vercel is not wanted: a Render Static Site (free) with the same static output; VERIFY its terms. (3) `browser-qa` pass against the deployed pair. (4) Write `guide/09-FRONTEND-CONSOLE-GUIDE.md` in the **`paybridge`** repository's `guide/` folder, in the project's usual style (analogy, why, what, line by line) and update `guide/00-START-HERE.md`. (5) Stretch: record a walkthrough video with the `ui-demo` approach.
* **Exit.** Suite green in CI; deployed console completes the full story against the deployed API; guide written; the honest-limits list updated.

---

## 10. Dependency graph and parallel work

```
29 CORS ─┬─► 33 scaffold ─► 34 shell/client/inspector ─┬─► 36 connect+guided ─┬─► 37 accounts ─► 38 internal ─► 39 external
30 logs ─┤                                             │                      ├─► 40 FX ─► 41 remittance ─► 42 compliance
31 sim  ─┤                                             └─► 35 log dock        └─► 43 settlement
32 info ─┘                                                                         44 admin/ops (after 36)
                                                    all ─► 45 quality ─► 46 tests+deploy+guide
```

* **Parallel:** Steps 29, 30, 31, 32 are independent of each other (different files; 30 and 31 both touch security wiring, so merge 30 first). Step 33 can start as soon as 29's contract snapshot exists. Step 35 can start against a mock stream before Step 30 lands. After Step 36, Steps 37, 40, 43 and 44 can run in parallel (separate routes and files); 38 and 39 follow 37; 41 follows 40; 42 follows 41.
* **Critical path:** 29, 33, 34, 36, 37, 40, 41, 45, 46.
* **Across repositories:** Steps 29 to 32 are in `paybridge`, Steps 33 onward in `paybridge-frontend`. They can proceed in two sessions at once. Step 33 needs only Step 29's contract snapshot; Step 35 needs Step 30 deployed (or a mock); Step 41 needs Step 31 deployed; Step 36 needs Step 32 deployed (or a mock).

---

## 11. Testing and verification

| Layer | Tool | What it proves |
|---|---|---|
| Back end unit and integration | existing suite plus new tests per Steps 29 to 32 | CORS, buffer, redaction, simulator, system info; all defaults off |
| Contract | generated types plus a stale-snapshot check | The console cannot compile against a changed API without a visible diff |
| Component | Vitest, Testing Library, MSW, axe | Forms, error states, money parsing, timelines, log behaviour |
| End to end | Playwright against a real local stack | Each story in section 1, including the refund story and the held-name story |
| Manual | Paystack sandbox | The real Paystack path (cannot be automated here) |
| Quality | accessibility audit, guidelines review, bundle budget | Section 3 invariants 9 and 10 |

**Verification loop for every step:** lint, type-check, tests, build; for back-end steps also the full Maven suite; then a manual run of the step's screen against a local back end.

**Definition of done for the whole plan:** all 18 steps' exit criteria met, section 8 fully ticked, the deployed console completes the full story against the deployed API, 0 failing tests, honest-limits list updated.

---

## 12. Review gate

Before Step 29 starts, run the `blueprint` adversarial review: a strongest-model sub-agent checks this plan against the following, and critical findings are fixed first.

* Does every step have a context brief that makes sense cold?
* Are the dependency edges right, and are the "parallel" steps truly independent (no shared files)?
* Is every new back-end surface admin-only, off by default, and tested for non-admin refusal?
* Could any step leak a secret to the browser, the logs, or a response?
* Can a user of the free tier still demo (wake-up, 0.1 CPU, memory)?
* Are there features in section 8 without a step, or steps without exit criteria?

**Status: not yet run.**

---

## 13. Risks and open questions

| # | Risk or question | Mitigation or decision needed |
|---|---|---|
| R1 | **Free-tier CPU (0.1) and the stream.** A held-open connection plus polling could slow the API | Cap viewers, keep-alive only, no per-line work, polling paused when hidden; measure in Step 35 |
| R2 | **Sleeping API.** Logs and timers stop; stream drops | Wake-up screen, reconnect with catch-up, "gap" marker; keep-alive pinger recommended |
| R11 | **Wake takes 4 to 5 minutes** on the free tier, and a wake probe can itself be slow or time out | Probes use a short timeout and backoff, are labelled "waking" not "error", and are visible in the Action Log; a hard limit with a clear message; the keep-alive pinger remains the real fix |
| R12 | **Typing a wrong or hostile address into the console would send the key there** | Invariant 13: key wiped on address change, `https` required, address always visible, recent-address list, no address read from the page's own link or query string |
| R13 | **Render's address changes** if the service is recreated | That is why the address is editable in the UI and has a Reset button |
| R14 | **Drift between the two repositories** (a back-end change breaks the console, or the console needs an enabler that is not deployed yet) | The committed contract snapshot and a regenerate-and-check script; back-end enablers first (rule 1 in section 9); a version note in each release; e2e tests run against the current back-end checkout |
| R3 | **Log buffer is memory-only** | Stated in the UI; Render's own log view remains the record |
| R4 | **Public Swagger and public console** are visible to anyone with the address | The console holds no data and no keys until one is pasted; consider an unguessable service name; admin features need the admin key |
| R5 | **Pasting an admin key into a web page** is a real risk if the page were compromised | Memory-only default, strict content security policy, no third-party scripts at runtime, dependency audit, the static site served from your own address; document the risk plainly |
| R6 | **Dev funding is off in `render.yaml`** | D3: turn on for a demo deployment, or fund through the remittance route |
| R7 | **Paystack path unverified end to end** | Manual verification step, honest label in the UI and guide |
| R8 | **Real-time via polling is not instant** | 2 to 3 second cadence is fine for a demo; stated |
| R9 | **Back end contract still thin** (no field descriptions) | Console carries its own labels; optional later step to enrich the OpenAPI text |
| R10 | **Time:** this is a large plan (18 steps) | Minimum viable demo is Steps 29, 30, 31, 33 to 36, 41 (live log + remittance story); the rest can follow |

**Decisions needed from you before Step 29** (the plan recommends the first option each time):

1. D1: separate static site (recommended) or serve the console from the Spring Boot app?
2. D2: partner simulator inside the API (recommended) or a separate small server?
3. D3: enable dev funding on the demo deployment (recommended, admin-only, sandbox) or require funding via remittance?
4. D5: React with the stack in section 5 (recommended) or something simpler (plain HTML and JavaScript)? Simpler is quicker to start but the log dock and state handling get harder to maintain.
5. Do you want the stretch demo video (Step 46.5)?

---

## 14. Anti-patterns to avoid

* Building screens before the contract and error handling exist.
* Re-implementing business rules (fees, rounding, limits) in the browser. The server is the authority; the console only displays.
* Floating-point money anywhere.
* Showing raw JSON as the only output. Show a readable result **and** the raw exchange.
* Logging, storing or URL-encoding keys.
* Polling forever or in hidden tabs.
* Silent failure: every error must say what happened, what it means, and what to do.
* A log panel that animates every line, announces every line to screen readers, or holds unbounded history.
* Colour as the only status signal.
* Card inside card, decorative gradients, hero banners on a tool.
* Fixed sleeps in tests; tests that depend on the real Paystack.
* Bundling the partner secret, the Paystack key or any admin key into build-time environment variables.

---

## 15. Plan mutation protocol

Per `blueprint`: any change to this plan is recorded here with a date and reason.

* **Split** a step when its tasks exceed one pull request: keep the number, add a suffix (for example 41a, 41b).
* **Insert** a step by adding a lettered step after the one it follows; update the graph.
* **Skip** a step only with a written reason and a check that nothing downstream depended on it.
* **Reorder** only along dependency edges.
* **Abandon** a step by marking it abandoned, never deleting it.
* Every mutation adds a line to the table below.

| Date | Change | Reason |
|---|---|---|
| 2026-10-21 | Plan created | Requested |
| 2026-10-22 | Moved this plan out of the `paybridge` repository into the new `paybridge-frontend` repository; replaced the monorepo assumptions (a `frontend/` folder, Vercel root directory, `.dockerignore` entry, back-end-triggered builds) with a two-repository layout; added the repository column and tags, rules for working across both, decision D13, risk R14, and an updated Step 33, 46 and 5A | Requested |
| 2026-10-21 | Adjusted section 5A for the Hobby (free) plan: free-tier rule, usage budget, unavailable paid features and workarounds, new risks V7 and V8, invariant 15 | Requested |
| 2026-10-21 | Added section 5A (Vercel deployment and optimization), decision D12, Step 29/33/46 tasks, Vercel risks V1 to V6; checked Vercel plan, vercel.json, environment-variable and deployment-protection docs | Requested |
| 2026-10-21 | Added editable Backend Address (default: the Render URL), Wake button and automatic wake-up, and the Action Log (every click's endpoint printed in the log pane). Touched sections 1, 3, 4, 6, 7, 9 (Steps 29, 34, 35, 36), 13, Appendix A (D9 to D11) | Requested |

---

## Appendix A: Decision records (proposed)

Drafts only; nothing is written to `docs/adr/` unless you approve.

* **D1: Separate static site (hosted on Vercel, see D12).** *Context:* the API sleeps on the free tier. *Decision:* host the console separately. *Consequence:* needs CORS (Step 29); the console loads while the API wakes. *Alternative:* serve from Spring Boot (no CORS, but the UI sleeps with the API and the Docker build grows).
* **D2: Partner simulator in the API.** *Context:* the browser must not hold the partner secret. *Decision:* a demo-only, admin-only, off-by-default endpoint signs on the server and passes through the real webhook service. *Consequence:* one more guarded endpoint; the real route is untouched. *Alternative:* a separate proxy server holding the secret (another deployment and another secret).
* **D3: Dev funding on the demo deployment.** *Context:* an internal transfer needs a funded account. *Decision (recommended):* allow the existing dev-funding endpoint on the demo deployment only. *Consequence:* `render.yaml` flips a flag for the sandbox; the endpoint is admin-only. *Alternative:* keep it off and require a completed remittance first (slower, but a better story).
* **D4: Streaming with the fetch reader, not the browser's EventSource.** *Context:* EventSource cannot send the API-key header. *Decision:* read the stream with fetch. *Consequence:* a little more client code (reconnect and parsing); keys never appear in an address. *Alternative:* a short-lived ticket in the address (adds a ticket endpoint and a leak risk).
* **D5: React, TypeScript, Vite.** *Context:* complex live state and a long list. *Decision:* the stack in section 5. *Consequence:* a build step, in its own repository.
* **D6: Browser-side "recent items".** *Context:* no list-all endpoints. *Decision:* the console remembers what it created, in the browser only. *Consequence:* items created elsewhere are not listed; stale after the free database is replaced. *Alternative:* new admin list endpoints (more back-end work and surface).
* **D7: Polling for state, streaming only for logs.** *Context:* simplicity and free-tier CPU. *Decision:* poll in-progress objects every 2 to 3 seconds; one stream. *Alternative:* a stream for everything (more back-end work).
* **D12: Vercel for the console, direct calls to Render.** *Context:* you asked for a Vercel-optimized front end; the API is a Java container that stays on Render. *Decision:* pure static build on Vercel Hobby, browser-to-Render calls, no proxy rewrites, build-time default address plus runtime override, strict same-origin scripts. *Consequence:* the API needs a CORS allow-list entry for the Vercel address; previews need extra handling; non-commercial use only. *Alternative:* proxy through Vercel rewrites (hides CORS, loses the editable address, unverified for long streams); Render Static Site (one dashboard, but less tooling for previews).
* **D13: Two repositories.** *Context:* on 2026-10-22 you asked for the console to live in its own repository, `paybridge-frontend`. *Decision:* the API and the console are separate repositories with separate histories, CI and deployments (Render and Vercel). *Consequence:* the OpenAPI description is the only coupling; back-end enabler steps (29 to 32) must be merged and deployed before the screens that need them are tested against the real API; the end-to-end suite needs a local checkout of the back end; changes that span both need two commits and two pushes. *Alternative:* a single monorepo (one commit can change both, but Vercel then needs a root-directory setting and an ignored-build rule, and the two histories mix).
* **D8: Log buffer in memory.** *Context:* no log store exists and none should be added for a demo. *Decision:* bounded ring buffer. *Consequence:* resets on restart.
* **D9: Wake by probing the health endpoint.** *Context:* Render wakes a free service on the first request that reaches it; there is no separate "wake" API. *Decision:* the console sends repeated light requests to the open health endpoint with backoff until it reports UP. *Consequence:* the first probe may itself be slow; probing is visible in the Action Log. *Alternative:* none needed on Render's side; an external pinger keeps the service awake but is outside the console.
* **D10: Backend address configurable in the UI, stored in the browser.** *Context:* the Render address can change and the console may be pointed at local or staging copies. *Decision:* build-time default plus a user override saved in local storage, never containing credentials. *Consequence:* a wrong address is possible, so invariant 13 applies.
* **D11: Client-generated request ids.** *Context:* the action log must join with server lines even when no response arrives. *Decision:* the console generates a UUID per request and sends it as `X-Request-Id`. *Consequence:* needs the header allowed by CORS (Step 29); relies on the server accepting safe ids (verified in `RequestIdFilter`).

---

## Appendix B: Glossary

* **CORS:** the browser rule that blocks a page from calling a different address unless that address says it is allowed.
* **Preflight:** the browser's "may I?" request sent before certain calls; it carries no API key.
* **SSE / streaming:** one long-lived response the server keeps writing to, used here to push log lines.
* **Ring buffer:** a fixed-size memory list that overwrites its oldest item when full.
* **Idempotency key:** a label on a request so repeating it returns the first result instead of acting twice.
* **Correlation (request id):** the id attached to a request and to every log line it causes.
* **Contract-first:** types and screens are derived from the published API description, so they cannot silently disagree.
* **Ledger proof:** showing that, for each currency, all debits and credits of a business event add up to zero.
* **Minor units:** the smallest currency unit (cents, kobo). All money is whole numbers of these.
* **Simulator:** the demo-only admin endpoint that plays the corridor partner by sending a correctly signed "money arrived" message.
