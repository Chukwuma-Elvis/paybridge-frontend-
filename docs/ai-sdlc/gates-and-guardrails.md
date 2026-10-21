# Gates and guardrails (specification, not yet implemented)

Playbook: a skill is advisory; a **hook** is the deterministic layer behind it. Build-phase hooks block or allow without a human; approval-gate hooks pause for a named person. This file specifies what each should do. **No hook, setting or CI job exists yet**; they are created with Step 33 (hooks and settings) and Step 46 (CI), once code is requested. Treat the lists below as requirements to implement and test, not as things already enforced.

## A. Build-phase guardrails (fast, scoped to the file or command, no human)

| # | Guardrail | Backs which rule | Behaviour |
|---|---|---|---|
| H1 | Protect generated and snapshot files | CLAUDE.md "never edit generated types or the contract by hand" | Block edits to the generated types folder and `contract/openapi.json`; the message says to run the regenerate command |
| H2 | Keep secrets out of the diff | console-security skill | Block writes whose content looks like a key, token or `.env` value; block creating tracked environment files with real values |
| H3 | No `VITE_`-prefixed secret names | console-security | Block adding any `VITE_` variable whose name suggests a secret (key, token, secret, password) |
| H4 | Format and lint after each edit | CLAUDE.md conventions | Run the formatter and linter on the changed file only |
| H5 | No direct network calls outside the API client | api-client-contract skill | Lint rule (not just a hook) bans direct `fetch` and XMLHttpRequest except in the client and the stream reader |
| H6 | Test-file lock during a fix task | Stage 4 loop protection | While a task is marked "bug fix", block edits to existing test files |
| H7 | Protected paths | | Block edits to `vercel.json` security headers and CI workflows without an explicit approval phrase in the session |

## B. Approval gates (a named human must approve)

| # | Gate | Approver | Why |
|---|---|---|---|
| G1 | Production deployment (push to `main` that triggers Vercel production) | Project owner | Agent may prepare releases, not publish them. Branch protection requires an owner-approved PR |
| G2 | Changes to the Content Security Policy or security headers | Project owner | Section 7 of the spec accepts a looser connection policy; any further loosening needs sign-off |
| G3 | Adding a dependency | Project owner | Supply-chain and bundle-size risk |
| G4 | Turning on the Vercel preview-origin pattern in the API | Project owner (in `paybridge`) | Security hole if wrong |
| G5 | Anything that would use a paid Vercel or Render feature | Project owner | Free-tier invariant |

## C. Branch and pipeline controls
- Branch protection on `main`: pull request required, owner approval required, status checks required (type-check, lint, unit tests, build, bundle budget, contract-staleness check, e2e smoke).
- The agent has no route to push to `main`; whatever it writes arrives as a pull request.
- Agent jobs in CI run with short-lived scoped tokens and no production credentials (there are none for a static site; the point is that none are added).
- Each non-interactive run acts under its own identity so the log separates the agent from the engineer who triggered it.

## D. Settings for the owner's machine (starting point, to tailor)
From the playbook's worked example, adapted to a solo learner. Apply when Claude Code is set up for this repository:
- Deny reading environment files and any secrets folder.
- Allow only the verify commands and read-only git commands without a prompt.
- Keep the sandbox on; keep network access limited to the package registry and Git host.
- Do not bypass permission prompts in this repository.
Managed (organisation-level) settings and a private plugin marketplace are **not applicable** to a single-person project; revisit if a team forms.

## E. What the evidence is
The literal output of the verify commands pasted in the session and attached as the PR check run; hook allow/block decisions with timestamps; the PR thread for review findings and approvals.

## F. Verification of the gates themselves
Each hook gets a test that proves it blocks the thing it claims to block and allows a nearby harmless action. A gate that has not been tested is listed as "specified" in `README.md`, never "enforced".
