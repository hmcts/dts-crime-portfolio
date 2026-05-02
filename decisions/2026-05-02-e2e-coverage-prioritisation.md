# 2026-05-02 — E2E coverage prioritisation, sequence, and dispatch plan

**Decision** — The QA / Test Engineer prioritises Playwright e2e coverage by mutation/consent risk first, page-traffic risk second, and embedded-third-party risk last. The execution sequence for the next batch is: (1) unblock `dossier.spec.ts` (currently skipped due to an RSC error), (2) parallel batch for HIGH-priority gaps that don't depend on dossier (Project Submission, Portfolio Filters, Access Control, Analytics consent), (3) parallel batch for HIGH-priority gaps that do depend on dossier (Edits / Studio, Exports), (4) MED gaps batched into a third parallel run as bandwidth allows. Email Reminders (LOW) are deferred indefinitely; Help / FAQ is already covered.

**Decider** — QA / Test Engineer (lens owner), with Lead Developer concurring on test-layer choices, Frontend / Backend Developer support per surface, and Product Manager ratifying the priority order against user-outcome cost. DevOps Engineer signed off on the parallel-agent dispatch shape (worktree per agent, no shared file conflicts).

**Context** — The Wave 2 retrospective (PR #75) recorded action item 5 as "coverage sweep — which user-visible flows have no e2e?". An Explore agent walked the 18 user-visible capability specs against the six existing tests in `playwright/tests/` and produced the priority matrix below. The sweep also surfaced a blocker: `dossier.spec.ts` is currently skipped due to a "Functions cannot be passed directly to Client Components" RSC error, which transitively blocks coverage of five downstream capabilities (Edits, Exports, Galaxy from the dossier surface, Profile, single-project flows from Submission).

## Coverage matrix

Existing coverage (six tests):

- `preview-auth.spec.ts` — sign-in flow + non-HMCTS rejection
- `portfolio-list.spec.ts` — portfolio listing
- `portfolio-empty.spec.ts` — portfolio empty state
- `help-search.spec.ts` — help / FAQ search
- `dossier.spec.ts` — **skipped** (RSC error)
- `sign-out.spec.ts` — sign-out flow + GET-rejection (added in PR #76)

| Capability | Priority | Rationale |
|---|---|---|
| Help / FAQ | NONE | Already covered by `help-search.spec.ts`. |
| Email Reminders | LOW | Async job, no user-facing flow. Validated via logs and audit trail. |
| Project Submission | HIGH | Six-section form with tier calculation, ChangeLog write, redirect to dossier. Mutation path; silent failure ships bad submissions. |
| Dossier | HIGH (blocker) | Currently skipped. Five downstream capabilities depend on it rendering. Highest leverage. |
| Edits / Studio | HIGH | Concurrent-edit safety, ChangeLog audit, lastUpdatedAt bump. Mutation path. |
| Exports | HIGH | Multi-format (Excel/Word/PowerPoint/Compliance). PII-redacted variant must not leak. Silent regression on regulatory feature. |
| Portfolio Management | HIGH | Core listing surface. Filters, search, stat tiles, Galaxy link — all currently uncovered beyond the empty/list snapshot. |
| Access Control | HIGH | Role-gated UI affordances (pencil icons, edit modes). Silent permission bypass = production incident. |
| Analytics consent | HIGH | GDPR-relevant. PostHog must NOT load before Accept. Cookie-driven banner-dismissal currently has unit tests but no e2e. |
| Action Plan Tracking | MED | High-traffic read surface, deep-link via `?action=…`, strand counts and linked projects. |
| Galaxy View | MED | Interactive canvas; lens switcher and overlays are read-mostly but visually high-stakes. |
| Events Listing | MED | Filters + search + modal — all read-mostly. |
| Learning Hub | MED | Filters + content viewer — read-mostly, future playlist sort. |
| Profile View | MED | Role-grouped projects; Edit/Open affordance per role. |
| Prompts Library | MED | Has writes (upvote, comment, submit) but mutation surface is small per page-load. |
| Reference Data | MED | Endpoint backs every dropdown; cache invalidation after inline create. |
| Change Tracking | MED | No direct UI; validated via Recent Activity panels and ChangeLog timestamps. |
| Compare Mode | MED | Diff view exists but primary UI not yet shipped per spec. Defer until UI lands. |

## Options considered

1. **Sweep, prioritise, dispatch parallel agents per HIGH gap (chosen).** Concentrates test-writing capacity where the consequences of regression are highest: mutation paths, consent flows, role-gated UI. Unblocks dossier first because it's a transitive blocker. Bundles MED into a second batch so each batch has a coherent theme.
2. **Cover everything in a single sequential push.** Would produce a complete test matrix but at the cost of weeks of single-agent work. The sweep priority was specifically asked for so we don't burn that time.
3. **Cover only the HIGH gaps; treat MED and LOW as backlog forever.** Cheap and focused, but the MED gaps (Action Plan, Galaxy, Events, Learning, Profile, Prompts) are exactly where high-traffic regressions are most likely to be noticed by users — silently going uncovered creates the same Wave-1-style "no one watches" problem the retrospective spec is meant to prevent.

## Decision rationale — option 1

- **QA / Test Engineer lens:** the regression-test-on-defect rule (PR #73 / #74) addresses defects after they happen. The coverage sweep addresses defects before they happen. Both are needed. The HIGH/MED/LOW split is the cheapest way to convert the sweep into a sequenced dispatch plan.
- **Product Manager challenge:** "would the user notice the missing test if we did nothing?" — for HIGH items yes (mutation lost, consent leak, exports broken); for MED items eventually yes (visible on traffic surfaces); for LOW items not in any user-visible way. The split tracks user-outcome cost.
- **Lead Developer feasibility:** parallel agent dispatch already proven in Wave 1 (8 agents) and Wave 2 (3 agents). Worktree-per-agent is the working pattern. Each test is independent of the others' changes, so parallelism is real (no shared-file conflicts).
- **DevOps Engineer view:** Playwright workflow is already wired and gating merges (`playwright.yml`). New tests added to `playwright/tests/` extend the gate without configuration changes.

## Sequence and dispatch shape

**Phase 1 — unblock the dossier:** investigate the RSC error in `dossier.spec.ts`, fix the underlying server/client boundary (or rewrite the test fixture if the dossier code is correct). Single agent, single PR. Other phases depend on this; running them in parallel would risk merging tests against a broken target.

**Phase 2 — HIGH parallel batch (no dossier dependency):** four agents in parallel, one per surface.

| Agent | Surface | Test brief |
|---|---|---|
| QA-submission | Project Submission | Sign in → `/portfolio/submit` → fill all six sections (mock reference-data endpoint) → verify tier recalculates → submit → assert redirect to `/portfolio/{id}` and ChangeLog row exists. |
| QA-portfolio-filters | Portfolio Management | Sign in → `/portfolio` → apply Stage filter → assert count updates → search "AI" → clear filters → click "Recent Activity {n}" tile → assert panel opens. |
| QA-access-control | Access Control | Three browser contexts: Viewer (no admin email), Editor (stub when available), Admin (allowlist). Assert pencil icon visibility and POST rejection per role. |
| QA-analytics-consent | Analytics consent | Fresh session: assert PostHog SDK NOT loaded; click Accept → assert SDK loads + cookie set + banner gone; reload → assert banner stays gone. Decline path: assert SDK never loads on subsequent navigation. |

**Phase 3 — HIGH parallel batch (dossier-dependent):** runs after Phase 1 lands and Phase 2 has merged or is approved.

| Agent | Surface | Test brief |
|---|---|---|
| QA-edits | Edits / Studio | As Editor: open dossier, click pencil on description, edit Portable Text, save, assert ChangeLog row written and `lastUpdatedAt` bumped. |
| QA-exports | Exports | Click "Export to Excel" on portfolio → verify .xlsx downloads with no email addresses (redacted variant). Repeat for Word, PowerPoint. Compliance briefing fires server-side. |

**Phase 4 — MED batch:** seven agents, one per surface (Action Plan, Galaxy, Events, Learning, Profile, Prompts, Reference Data). Run when Phase 2 and Phase 3 have merged, so the test fixtures from those phases are available for reuse.

## Consequences

- **The next batch is QA-led.** QA / Test Engineer dispatches; Frontend / Backend developers support each agent for their surface.
- **Dossier RSC fix is a hard blocker** for Phase 3. If it turns out to be more than a small fix, Phase 3 is paused and the surfaces it covers are re-prioritised against MED.
- **The Test plan section of every Phase-2/3 PR SHALL name the test file by path** per the regression-test-on-defect rule. Reviewers SHALL bounce a Phase PR that doesn't.
- **No spec changes triggered.** The capability specs already describe the user-visible flows; this decision is about coverage, not behaviour.
- **MED batch is committed-to but not scheduled.** It runs after Phase 2 and Phase 3, but not on a fixed date — the rate-limiting factor is what else the batch is doing. This decision is the prompt for future-us to find the time.

## Reversal triggers

Reopen this prioritisation when **any** of the following becomes true:

1. The dossier RSC fix turns out to be architectural (large effort) — rebalance Phase 3 against MED, possibly drop dossier-dependent HIGH gaps.
2. A user-reported defect surfaces in a MED capability — that capability's test gets bumped to HIGH for the immediate next batch.
3. A new capability lands (spec change) that introduces a user-visible flow — its test priority is set in the same change proposal.
4. The Performance Analyst or Security Engineer flags a coverage-pattern risk that this matrix doesn't account for.

## Cross-references

- `retrospectives/2026-05-02-wave-2-render-deploy-and-the-spec-feedback-loop.md` — action item 5 and its priority frame.
- `openspec/specs/engineering-team/spec.md` → *Regression test on every defect fix* requirement (canonical after PR #74).
- `playwright/tests/` — current six tests; the sweep is against this directory.
- `openspec/specs/*/spec.md` — the 18 capability specs that defined the surface.
- PR #76 — sign-out e2e (Phase 0 scope, already shipped).
