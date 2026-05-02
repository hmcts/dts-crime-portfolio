# DORA metrics for dts-crime-portfolio

The four DORA metrics — published by Google's [DevOps Research and Assessment](https://cloud.google.com/devops/state-of-devops) team — are the canonical software-delivery performance indicators. We track them so the team-of-agents working pattern (see `openspec/specs/engineering-team/spec.md`) has objective signal about whether iterating in parallel is actually delivering faster, more reliably, than a single-threaded approach would.

This doc names the four metrics, the data sources we have, how to compute today's numbers, and where the gaps are. The companion script at `scripts/dora.sh` prints a snapshot.

## The four metrics

| # | Metric | What it measures | Why it matters |
|---|---|---|---|
| 1 | **Deployment frequency** | How often we ship code to a running environment. | High-performing teams deploy on demand. Low frequency tends to correlate with batched, risky releases. |
| 2 | **Lead time for changes** | Time from first commit on a change to that change running in production (preview, here). | Captures end-to-end cycle time including review, CI, and deploy. |
| 3 | **Change failure rate** | Percentage of deploys that cause a degraded service or require a fix-forward. | Distinguishes "shipping fast" from "shipping fast and broken". |
| 4 | **Mean time to restore (MTTR)** | Average time from a failure being noticed to a fix being deployed. | Captures resilience — incidents happen; the question is how quickly they close. |

Two pairs of opposing tensions:

- **#1 vs #3** — deploy frequency without watching change failure rate is the "ship anything" anti-pattern.
- **#2 vs #4** — long lead times and slow MTTR usually share a root cause (slow CI, manual gates, no easy rollback). Optimising one tends to drag the other.

The four together form the **2024 DORA performance bands**: Elite, High, Medium, Low. We sit in the *Elite* band today by deployment-frequency alone — see the snapshot below — but lead-time and CFR data is too thin to claim a band overall.

## Data sources

| Source | Used for | Notes |
|---|---|---|
| GitHub Actions API (`gh run list`) | #1 deployment frequency, #3 change failure rate | The `deploy` workflow run is the deploy event; conclusion = success / failure. |
| Git log (`git log`) | #2 lead time | First commit on a branch → merge commit on main = approximation of lead time. |
| GitHub PR API (`gh pr list`) | #2 lead time | PR createdAt → mergedAt is a tighter proxy for "lead time for changes". |
| Render dashboard | #1 deployment frequency (cross-check) | Each successful deploy hook fire produces a Render deploy. |
| Decision-log entries (`decisions/`) | #3 change failure rate, #4 MTTR | When a defect prompts a fix-forward, the fix-forward PR or decision-log entry is the failure record. Today this is best-effort. |

## Gaps

- **Incident tracking** — we have no canonical "incident started at" timestamp, so MTTR is approximated by the time between a defect-fix PR's first commit and that PR's deploy. That under-counts the time between the defect *occurring* and *being noticed*. Fix when an incident-tracking system is adopted (could be GitHub Issues with a `incident` label, or a separate tool).
- **Production vs preview** — DORA is canonically about *production*. Today we deploy only to a Render preview. The numbers below are preview-side; once production lands, recompute with the production deploy workflow.
- **Rollbacks** — we don't currently track rollback events distinctly from forward fixes. Render's dashboard has the data; not yet pulled into this report.

## Snapshot — 2026-05-02 (the day this doc was authored)

Run `./scripts/dora.sh` for the current snapshot. The numbers below are the day-of-authoring baseline so a future reader can see the starting point.

| Metric | 2026-05-02 baseline | Performance band |
|---|---|---|
| Deployment frequency | 17 deploy runs (3 success, 12 failure at workflow level) | Elite by frequency; Low by success rate — caveat below |
| Lead time for changes | Median PR open-to-merge: 7.1 minutes; mean: 75.3 minutes (72 PRs) | Elite (< 1 hour median) |
| Change failure rate | 70.6% workflow-level; ~12% real | Mixed — workflow signal is misleading today |
| Mean time to restore | Sign-out bug: ~45 minutes from QA find → fix deployed. Single data point. | Insufficient data — single-incident average |

**The CFR caveat matters.** Today the workflow-level failure rate (70.6%) overcounts because of two infrastructure bugs that **didn't actually break a deploy**:

1. The `RENDER_DEPLOY_HOOK_URL` secret was first set to a literal `-` (operator error during the secret-set), so the workflow ran but curl failed before reaching Render. ~6 deploy runs reported failure but the existing live deploy was unaffected.
2. The deploy workflow's grep-the-body check rejected Render's HTTP 202 ("already deploying") response as failure even though the next deploy correctly picked up HEAD. ~2 deploy runs reported failure but the live preview tracked HEAD throughout.

By the strict definition (deploy required a fix-forward to address a user-visible bug):

1. The sign-out redirect bug from PR #56 — surfaced by QA on the preview, fixed in PR #72 (~45 minute MTTR).
2. The dossier RSC error — surfaced by the QA coverage sweep (not a user), fixed in PR #78. Borderline because no user reported it; counted as a failure here because it was a runtime error that would have been visible to any user clicking through to a dossier.

So a more honest CFR for the day is roughly **2 / 17 ≈ 12%** — Medium band, not Low. Wave 3 onwards, the deploy-202 fix (PR #80) and the secret rotation should both have landed, and the workflow-level number will track reality.

## How to recompute

```sh
./scripts/dora.sh
```

The script prints today's snapshot to stdout. It uses `gh` and `git` only — no external services. To recompute for a different window, edit the `SINCE` variable at the top.

## Cadence

A snapshot is recommended at the end of each parallel-agent batch, alongside the retrospective. Add it to the retro file under a `## DORA snapshot` section. Wave 1 and Wave 2 retros pre-date this doc; Wave 3 onwards is the natural starting point.

## References

- [Accelerate](https://itrevolution.com/product/accelerate/) — Forsgren, Humble, Kim — the book that introduced these metrics.
- [State of DevOps](https://cloud.google.com/devops/state-of-devops) — annual report; the band thresholds in this doc are from the 2024 edition.
- [DORA core](https://dora.dev/) — the DORA team's own canonical reference.
- `openspec/specs/engineering-team/spec.md` — the working pattern these metrics measure.
- `retrospectives/` — the cadence point at which DORA snapshots get recorded.
