# Maintenance and closing the loop (specification, not yet implemented)

Playbook (Stage 6): a **deterministic** script watches a metric and invokes the agent when a control band is breached. Detection involves no model. The tier decides what the agent may do. The agent writes its finding as `intent.md`, which re-enters the pipeline.

## Is this worth building for a demo console?
Mostly no. There is no production traffic, no database and no users. The playbook's pattern still applies cheaply to **process and delivery metrics**, which the playbook itself says the harness handles ("PR cycle time"). So the proposal is small and deferred until after the console's first release.

## Candidate metrics (proposed)
| Metric | Source | Why it is stable enough to watch |
|---|---|---|
| CI test failure rate | CI run history | Playbook's own example |
| Playwright flake rate (retries per run) | Test reports | Detects a creeping timing problem |
| Initial JavaScript size of the production build | Build output | Detects bundle creep |
| Lighthouse scores of the deployed production URL | Scheduled run | Detects performance and accessibility drift |
| Daily Vercel deployments vs the 100 per day allowance | Deployment list | Early warning for the free-tier limit |
| Contract drift (snapshot differs from the deployed API's `/v3/api-docs`) | Scheduled comparison | Detects back-end changes the console has not caught up with |

## Response tiers (proposed, per the playbook)
| Tier | Meaning | Action |
|---|---|---|
| 1 sigma | Slight drift | Log only |
| 2 sigma | Clear drift | Invoke the agent read-only to diagnose; findings written as an intent |
| 3 sigma | Breach | The agent may only open a pull request into the review gate (revert, quarantine a flaky test, refresh the contract snapshot) or trigger a pre-approved runbook |

Rules (Western Electric or similar) catch slow drift as well as spikes. The detection script is version-controlled and unit tested. Tier boundaries live in a version-controlled config file, to be created with the script.

## Pre-approved runbooks (proposed)
- Roll back the Vercel production deployment to the previous one (dashboard action; rehearse it once before relying on it).
- Refresh the contract snapshot and regenerate types as a pull request.
- Quarantine a flaky test as a pull request, never by deleting it.

The agent has **no** standing production credentials and cannot push to `main`.

## Incident record (template)
Use for any real problem found after release. Save as `lessons/<yyyy-mm>-<slug>.md`.

```
# Incident: <title>
Detected: <time, how>   Resolved: <time>   Severity: <low/med/high>
## What happened
## Evidence (links to logs, deployments, request ids)
## Cause
## Fix (commit SHA, pull request)
## Eval added (name, file)
## What changes in CLAUDE.md / skills / hooks as a result
## Follow-up intent (link) or "none"
```

## Incidents arriving from chat (Claude Tag)
The playbook describes Claude as a first responder in a Slack incident channel. This project has no team channel, so that part does not apply; the incident record above is the substitute.

## Order of work
1. First release shipped. 2. Add the CI and Lighthouse metrics. 3. Write the detection script and tests. 4. Add tiers. 5. Rehearse the rollback. Only then consider anything automatic.
