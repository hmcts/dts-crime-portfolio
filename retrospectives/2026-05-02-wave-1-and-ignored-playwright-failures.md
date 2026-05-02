# 2026-05-02 — Wave 1 build batch + ignored Playwright CI failures

**Date:** 2026-05-02

**Trigger:** Two simultaneous triggers per the team-retrospective spec.

1. **Parallel-agent batch concluded.** The Wave 1 build of eight feature agents (submission, inline-edit, prompts writes, exports, compare, galaxy v1, observability, ops) plus the engineering-team spec, the Sanity v4 migration, the Dependabot security fixes, the architecture artefacts, the LICENSE/README work, the GA-defer decision, and the Render Blueprint + deploy action have all reached either merged or open-ready-to-merge state.
2. **Ignored CI signal.** `gh run list --branch main --workflow playwright.yml` shows the Playwright workflow has reported `failure` on every recent run — well over the three-consecutive-runs threshold. No persona noticed.

**Participants (active):** Delivery Manager (facilitator), DevOps Engineer, QA / Test Engineer, Lead Developer, Product Manager.

**Previous retro action items:** First retrospective — none.

## What went well

- **The parallel-agent pattern delivered.** Eight feature PRs in roughly the time of one. The team-of-agents working model held up under load. Coordination contracts (do-not-touch lists, shared script-name conventions) prevented most cross-agent conflicts.
- **The CI signal *worked when looked at*.** CodeQL caught the ReDoS in the submission email regex (PR #42, fix in #49). The dev-deps Dependabot bump (#36) was correctly closed when build broke. The `@sanity/vision` solo bump (#37) was correctly closed when paired-major-bumps were the right path. Each PR-time CI signal was acted on.
- **The decision log got real use immediately.** GA defer, architecture artefacts, deploy strategy — all logged. Future readers will see why those calls were made.
- **The engineering-team spec paid off in the same batch it landed in.** Once active/standby personas + decision-log + delegation patterns were defined, the PRs that followed were tighter and easier to review.
- **Stale agents were recoverable.** Six of the eight Wave 1 agents stalled at the watchdog timeout near the commit step. All six were recovered — work was found in the worktree, checks re-run, PRs opened. No work was lost.

## What didn't go well

- **The Playwright workflow has been failing on every push to main since PR #30 introduced it, and no persona watched.** The workflow has `if: hashFiles('playwright.config.ts') != ''` to skip when no config exists, but with all jobs skipped, GitHub Actions reports the workflow conclusion as `failure` (rather than `skipped` or `success`). The signal was loud and no one looked.
- **No Playwright tests have ever shipped.** The QA agent stalled twice in different waves and the work was abandoned. The team noted "QA agent stalled" in passing but didn't put it on a backlog or assign a recovery owner. The DevOps agent built the workflow assuming the config would arrive; the QA work that should have produced it didn't, and nobody closed the loop.
- **The dispatch model treats "CI green at PR time" as "done".** What happens to CI on `main` after merge wasn't watched by anyone. There's no working-agreement step that says "after merge, check `gh run list --branch main`". The repeated Playwright failures sat there for the entire build session.
- **The Dependabot dev-deps group config was over-aggressive.** Bundled five major-version bumps into one PR (#36). The PR was closed when CI broke; the underlying config wasn't updated. The same situation will recur next Dependabot run.
- **PR descriptions before the engineering-team spec landed didn't carry team composition.** Earlier PRs in the batch (the wave-1 PRs that opened before #50) don't include the active/standby/not-relevant section that later PRs do. Retroactively un-fixable; observed for the future.

## Surprises

- **A workflow with all jobs skipped via `if:` reports `failure`, not `skipped` or `success`.** A GitHub Actions edge case worth knowing. Bears on how we write conditional workflows going forward.
- **The team-spec's "Product Manager outranks build it" rule produced visible savings.** The GA-defer decision (PR #53) shipped as a documentation entry instead of a multi-PR provider abstraction. Without the rule, the default would have been to build.
- **Recovering a stalled agent's worktree was surprisingly tractable.** The work was usually 80–100% complete; a few targeted edits and a fresh CI run got each one over the line. The watchdog timeout flagged earlier than expected; perhaps `timeout_ms` could be longer for build-heavy agents.

## Action items

1. **Fix the Playwright workflow so it stops reporting failures on `main`.** Replace the job-level `if: hashFiles(...)` guard with a guard job that always succeeds and outputs a flag; e2e job runs only when the flag is true. **Owner:** DevOps Engineer. **Artefact:** PR. **Horizon:** this batch (alongside this retro).

2. **Re-attempt Playwright e2e tests.** Dispatch a fresh QA agent or schedule the work as a routine. The first set is small (preview-auth flow, portfolio empty state, portfolio with mocked Sanity, dossier render, help-faq search). Reuse the half-built work in `dts-crime-portfolio-qa` worktree if salvageable. **Owner:** QA / Test Engineer. **Artefact:** PR. **Horizon:** next batch.

3. **Watch CI on `main`, not just on PRs.** Add a step to the team's working agreement: after every merge, the Delivery Manager checks `gh run list --branch main --limit 5` and surfaces any failure. Record the agreement in `CLAUDE.md` under "How work is done". **Owner:** Delivery Manager. **Artefact:** PR (CLAUDE.md update). **Horizon:** next batch.

4. **Tighten the Dependabot dev-deps group.** Update `.github/dependabot.yml` so the dev-dependencies group covers only `update-types: minor` and `update-types: patch`. Major bumps come through as individual PRs so each can be assessed in isolation. **Owner:** DevOps Engineer. **Artefact:** PR. **Horizon:** this batch.

5. **PR-template reminds about Team section and decision-log link.** The PR template at `.github/PULL_REQUEST_TEMPLATE.md` should make active/standby/not-relevant personas a visible section by default, plus a "Linked decision-log entries" line. **Owner:** Delivery Manager. **Artefact:** PR. **Horizon:** this batch.

## Working agreements changed

- **Watch main CI** — after every merge, the Delivery Manager runs `gh run list --branch main --limit 5` and surfaces failures. Filed as action item #3 above.
- **Retro cadence adopted** — the team commits to the cadence in the new `team-retrospective` spec: end of every parallel-agent batch, after three consecutive ignored CI signals, on demand, and at least every two weeks of active work.
