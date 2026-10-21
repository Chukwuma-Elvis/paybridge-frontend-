# Source of truth

Playbook rule (Stage 3 sidebar): for every artifact, name **one** system as the source of truth; everything else holds a copy or a link.

This project has no Jira, ServiceNow, Figma or change board, so the repository is the source of truth for the artifacts. Platform settings that live outside git are listed too, because they are part of the record.

| Artifact or setting | Source of truth | Copies / links | Notes |
|---|---|---|---|
| Intent | `intent/` in this repository | PR/issue links | Acceptance = merge or closed review |
| Spec | `spec/` in this repository | | Signed off by the product owner |
| Plan | `plans/` in this repository | | Updated in the same commit as any departure |
| Code, tests, review findings | Git history and pull requests | | PR is the audit record |
| API contract | The running API's `/v3/api-docs`, snapshotted to `contract/openapi.json` here | Generated types | Snapshot is regenerated, never hand-edited |
| Back-end behaviour | Repository `paybridge` (and its `guide/` folder, local only) | | Not edited from this repository |
| Allowed CORS origin | **Render dashboard environment** on the API service | Mentioned in the plan, **not committed** | The real Vercel address stays out of both repositories |
| Default backend address | **Vercel project environment** (`VITE_DEFAULT_BACKEND_URL`) | Build output | Public by design; changing it needs a redeploy |
| Admin / partner / Paystack secrets | **Render dashboard** (API) and the owner's password manager | Never in git, never in this repository | |
| Vercel project settings | Vercel dashboard, mirrored in `vercel.json` and plan s.5A.3 | | Verify mirror at each release |
| Lessons and incident records | `lessons/` in this repository | Render/Vercel logs for raw evidence | Memory-only log buffer in the API is not a record |

## Linkage minimum
Every pull request description links the intent, spec and plan step it implements (the PR template has the fields). Every incident record names the commit SHA of the fix and the eval added.

## Declared exception
The two repositories are separate sources of truth for their own code. The only coupling is the OpenAPI contract; a back-end change that alters it must be followed by a snapshot refresh here.
