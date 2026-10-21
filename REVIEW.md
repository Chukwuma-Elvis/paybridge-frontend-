# Review instructions

Used by the AI reviewer on every pull request. Findings never approve or block a PR on their own: branch protection still requires approval from a human code owner.

## Passes
Run four passes and tag each finding with its pass:
- **Bugs:** logic errors, broken edge cases, race conditions in polling and reconnect, subtle regressions, unbounded lists or timers.
- **Security:** a key, partner secret or Paystack secret reaching a log line, URL, storage, error message, bundle or `VITE_` variable; unmasked `X-API-Key` in the Request Inspector or Action Log; the address validator or the key-wipe-on-address-change rule bypassed; a script from another origin; weakened Content Security Policy.
- **Compliance with the artifacts:** the change matches `spec/frontend-demo-console.spec.md` and the approved plan (`plans/frontend-demo-console.plan.md`); the project invariants (plan section 3) still hold; the Vercel free-tier rule (no paid feature, no function, no proxy rewrite) still holds.
- **Quality:** money handled as integers; every request through the single API client and visible in the Action Log; hand-written API types; all UI states present; accessibility (labels, focus, keyboard, live regions); tests exist for the new behaviour and are not weakened.

## What Important means here
Reserve **Important** for findings that would break behaviour, leak a secret, lose or misreport money values, breach an invariant, or break the free-tier deployment. Style and naming are nits.

## Cap the nits
Report at most five nits per review; summarize the rest as a count.

## Check the artifacts moved together
- If behaviour departs from the plan, the same commit must update the plan. Flag it if not.
- If `CLAUDE.md` or `.claude/**` is outdated by the change, flag it.
- If a mistake is flagged for the second time, propose the line to add to `CLAUDE.md`.

## Do not report
Generated files (API types under the generated folder, the contract snapshot), lockfiles, and anything CI already enforces (formatting, lint, type errors).
