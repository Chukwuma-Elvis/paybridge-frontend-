# Continuous evals (specification, not yet implemented)

Playbook (Stage 4): evals are the AI-native stage-gate. They are real tasks, each written as a prompt plus checks that define "acceptable". The suite runs in CI when `CLAUDE.md`, `.claude/**` (skills, agents, hooks) or `REVIEW.md` change, and on a schedule. A change that lowers the pass rate is reviewed before it merges. Every incident adds an eval.

**Status:** none of these exists as a runnable eval. The playbook recommends 20 to 50 real tasks "from recent work"; this project has no recent work yet, so the list below is **candidate tasks derived from the plan**, to be turned into real evals as the first steps are built and replaced by real tasks as they occur. Checks are written so they can be measured by the toolchain, not by opinion.

## Format of one eval (when implemented)
Prompt; starting commit; allowed tools; checks (commands that must exit zero, files that must or must not change, text that must not appear); owner; date added; link to the incident if any.

## Candidate evals
| # | Task given to the agent | Checks |
|---|---|---|
| E1 | Add a money-input component that accepts "1,234.50" for a 2-decimal currency | Unit tests pass; the value is an integer in minor units; no floating-point arithmetic on money (lint rule); 3 decimals rejected |
| E2 | Format a balance of 1 minor unit and of the largest safe integer | Exact strings; no exponent notation; no rounding error |
| E3 | Add a new read-only API call (a GET) | Goes through the API client; "sent" and "finished" Action Log events emitted with the same request id; no direct `fetch` |
| E4 | Add a new write call (a POST) with an idempotency key | Retry reuses the same key; double-click sends one request |
| E5 | Handle a 429 response | Countdown from `Retry-After`; no retry storm; test with a fake clock |
| E6 | Change the Backend Address in the session store | Key wiped; cache cleared; non-https non-localhost address needs confirmation |
| E7 | Wake service against a fake server that returns 502 three times then 200 | Backoff schedule honoured; "waking" state shown; stops on UP; stops on cancel; stops at the limit |
| E8 | Add a log-line filter ("only this request") | Virtualized list stays responsive with 10,000 lines (performance test); filter combines with level filter |
| E9 | Reconnect the log stream after a drop | Resumes from the last sequence number; no duplicate lines; gap marker when the buffer wrapped |
| E10 | Add a screen that shows an API error | Shows the problem detail, request id and what to do; a11y check passes; no stack trace |
| E11 | Mask the API key in the Request Inspector | The key string appears nowhere in recorded text (assert over the whole store) |
| E12 | Regenerate types after the contract snapshot changes | Compiles; the stale-snapshot check passes; no hand-edited generated file |
| E13 | Add a `VITE_`-prefixed environment variable | Allowed only for non-secrets; a secret-looking name is rejected by the guardrail |
| E14 | Build the status timeline for a remittance from history fixtures | Every state renders; current state marked; keyboard reachable |
| E15 | Build the ledger proof strip | Integer arithmetic; sums to zero per currency for a balanced fixture; shows imbalance for an unbalanced one |
| E16 | Fix a reported bug where a quote countdown shows a negative number | Failing test written first and committed; fix does not edit that test |
| E17 | Add a route | Code-split chunk; initial bundle within budget; deep link works through the SPA fallback |
| E18 | Change the Content Security Policy | Requires the approval phrase (gate G2); report-only first |
| E19 | Add a dependency | Blocked without approval (gate G3) |
| E20 | Review a deliberately flawed PR (secret in a log, float money, direct fetch) | The reviewer reports all three as Important, tagged with the right pass |

## When to run
- On any pull request touching `CLAUDE.md`, `REVIEW.md` or `.claude/**`.
- On a nightly schedule.
- After every model change.

## Rules
- Evals use recorded fixtures or fakes; **none may call the real Paystack or the real Render API**.
- A case that stops discriminating (always passes) is replaced by a harder one.
- Each production incident becomes an eval, written by whoever owned the incident, and stays in the suite.

## Cost note
CI runs of the agent consume an API key with its own budget. This project has none configured; running evals in CI is therefore optional until the owner provisions one. Running them locally by hand is acceptable meanwhile.
