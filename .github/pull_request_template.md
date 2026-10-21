## What and why
<One or two sentences.>

## Traceability
- Intent: `intent/…`
- Spec requirement IDs: FR-
- Plan step: Step __ (`plans/frontend-demo-console.plan.md`)
- Back-end dependency (repository `paybridge`): none / Step __ merged and deployed on <date>
- Plan updated in this PR if the work departed from it: yes / not needed

## Evidence (paste the real output; do not summarise)
- [ ] Type-check
- [ ] Lint
- [ ] Unit/component tests
- [ ] Build (and bundle budget)
- [ ] E2E smoke (if the change touches a flow)
- [ ] Screenshot or recording for UI changes (compared with the mock where one exists)

## Checklist (REVIEW.md passes)
- [ ] No secret in code, logs, URL, storage, error text or a `VITE_` variable
- [ ] Money is integer minor units; no client-side fee or rate calculation
- [ ] Every request goes through the API client and appears in the Action Log
- [ ] All UI states designed; keyboard and screen-reader checked
- [ ] No paid Vercel/Render feature, no function, no proxy rewrite
- [ ] `CLAUDE.md` / skills updated if a mistake repeated or a convention changed

## Risk and rollback
<What could this break? How is it undone?>

## Approvals
Findings from the AI review do not approve this PR. A human code owner must.
