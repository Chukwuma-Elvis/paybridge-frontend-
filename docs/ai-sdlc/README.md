# AI-native SDLC for paybridge-frontend

How this project follows the *AI-Native SDLC Playbook* (Louis Claxton, Anthropic; 54 pages, read in full on 2026-10-22). The idea: every stage ends by committing an artifact that the next stage reads, so the chain of commits is the audit trail.

## The artifact chain, and where each lives

| Stage | Playbook artifact | This project | Status |
|---|---|---|---|
| 1 Plan | `intent.md` | [`intent/frontend-demo-console.intent.md`](../../intent/frontend-demo-console.intent.md) (template: `intent/_TEMPLATE.md`) | Draft, **not yet accepted** |
| 2 Design | `spec.md` | [`spec/frontend-demo-console.spec.md`](../../spec/frontend-demo-console.spec.md) | Draft, **not yet signed off** |
| 3 Build | `plan.md`, `CLAUDE.md`, skills, hooks, subagents | [`plans/frontend-demo-console.plan.md`](../../plans/frontend-demo-console.plan.md) (18 steps, much larger than the playbook's one-page example), [`AGENTS.md`](../../AGENTS.md) (agent-neutral; `CLAUDE.md` just imports it), [`.claude/skills/`](../../.claude/skills), [`.claude/agents/`](../../.claude/agents), [`gates-and-guardrails.md`](gates-and-guardrails.md) | Plan proposed; no code yet; hooks specified, **not built** |
| 4 Test | feedback loop, continuous evals | plan s.11, [`evals.md`](evals.md) | Specified, **not built** |
| 5 Deploy | `REVIEW.md`, approval gates, CI/CD | [`REVIEW.md`](../../REVIEW.md), [`.github/pull_request_template.md`](../../.github/pull_request_template.md), [`gates-and-guardrails.md`](gates-and-guardrails.md), plan s.5A | Review policy written; no CI yet |
| 6 Maintain | monitoring bands, incident record, lessons | [`monitoring-and-loop.md`](monitoring-and-loop.md), [`lessons/`](../../lessons) | Specified, **not built** |

Supporting: [`source-of-truth.md`](source-of-truth.md) (which system is authoritative for each artifact) and [`metrics.md`](metrics.md) (leading and lagging indicator per play, read from git).

## How the stages hand off

1. An **accepted intent** (merged or closed review) starts the spec pass.
2. An **approved spec** starts plan mode; the approved plan is committed.
3. A **merged PR** starts the pipeline (type-check, lint, tests, build, bundle budget, review pass).
4. A **breached control band** (or an incident) writes the next intent.

Today you run each step by hand ("prompt each step by hand"); the aim, per the playbook, is a loop where each accepted artifact fires the next gate.

## Two repositories

This repository covers the console (plan Steps 33 to 46). The API enablers (Steps 29 to 32) happen in `paybridge`. Where this repository's artifacts need something from there, they say so. The back-end repository has its own `guide/` folder (gitignored) and does not yet have a `CLAUDE.md` or `REVIEW.md`; creating them there is a separate task.

## Honest status

Nothing here has been run. Humans have not accepted the intent or the spec. The playbook's hooks, CI evals, monitoring script and managed settings are specified in words but not implemented, because no code has been requested yet.

## Reading order for a new person
1. This file → 2. `intent/…intent.md` → 3. `spec/…spec.md` → 4. `plans/…plan.md` → 5. `CLAUDE.md` → 6. `REVIEW.md` → 7. the rest of `docs/ai-sdlc/`.
