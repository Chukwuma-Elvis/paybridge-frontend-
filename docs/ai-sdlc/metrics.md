# Metrics: leading and lagging indicators

From the playbook's "How to measure it" for each play, translated to what this project can read from git, pull requests and CI. **Nothing is measured yet.** There is no history. Baselines are taken after the first five pull requests.

| Play | Leading indicator | Lagging indicator | Where it is read |
|---|---|---|---|
| Capture as intent | Time from first conversation to a committed `intent.md` | Share of intents accepted into design; edits to the intent after the first spec commit | Git history of `intent/` |
| Requirements and design | Time from intent commit to spec commit | Spec commits dated after the first plan commit (requirements rework) | Git log of `spec/` and `plans/` |
| Plan mode | Share of changes that merge from the first implementation pass; time from plan approval to merged PR | Rework cycles per change; how often the merged diff still matches the plan | PR metadata |
| CLAUDE.md | How often a mistake that `CLAUDE.md` should have caught is repeated | Time to first merged PR for a new contributor | Git history of `CLAUDE.md`; PR history |
| Skills | Time from a policy change to the updated skill merging | Review findings that cite the policy (should fall to zero) | PRs on `.claude/skills/`; PR review findings |
| Hooks as guardrails and gates | Time spent waiting on each approval gate | Gate violations reaching production | Hook decision log; incident records |
| Parallel sessions | Concurrent sessions per person while review quality holds | Changes merged per week alongside the rework rate | Session traces; PR history |
| Feedback loop | First-pass CI success rate for agent-written changes | Review time per PR; change failure rate | CI; PR metadata; incident records |
| Continuous evals | Eval pass rate over time; time for an incident to become an eval | Regressions caught in CI vs found in production | Eval runs; incident records |
| PR review loop | Time to first review; share of comments resolved without a human touching the branch | Defects caught before merge vs escaping | PR history |
| CI/CD | Share of pipeline failures triaged without a human | Delivery metrics (DORA) from CI and deployment tooling | CI logs; Vercel deployment list |
| Closing the loop | Time from band breach to an intent in the queue | Share of findings that become merged fixes; repeat incidents | Detection script log; PR history |

## Rules
- Report numbers only from a source in the table. Say "not enough data" before there is any.
- A metric that nobody acts on is removed.
- Review these once a month together with `REVIEW.md` tuning (rate findings, cap the nits).
