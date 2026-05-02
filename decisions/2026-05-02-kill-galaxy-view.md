# 2026-05-02 — Kill the Galaxy view

**Decision** — The `galaxy-view` capability is killed. The route `/galaxy`, every component under `components/galaxy/`, every helper under `lib/galaxy/`, the Vitest suite under `tests/galaxy-*`, the sidebar nav entry, and every cross-capability cross-reference are removed. The two `galaxy_*` events leave the analytics closed-event catalogue. The `galaxy-view` OpenSpec capability SHALL be archived via the standard archive flow once the change PR is merged. Decision driven by the Product Manager's verbatim reason: *"it gives nothing."*

**Decider** — Product Manager. The Lead Developer concurs on engineering scope: removal is mechanical (no other capability imports `lib/galaxy/`, no API route depends on the surface, the analytics catalogue change is two-line plus a union edit) and the bundle gets smaller. The Information Architect confirms no surface loses navigation — the sidebar Galaxy entry was the only inbound link, and the portfolio spec's "Galaxy view" link is removed in the same change. The Service Designer notes that no UR finding has yet validated the Galaxy concept; with PR #88's first round of moderated UR pending, removing this surface reduces the test matrix without removing any *recorded* user value.

**Context** — Galaxy was specified as a zoomable, pannable canvas constellation map at `/galaxy` where every project is a star and every constellation is a cluster under a chosen lens (Capability, Stage, Business area, Delivery area, Governance). It carried signal overlays (Compliance gaps, Updated in 7 days, No update in 30 days), a legend with focus, camera controls, per-lens layout caching, search and shared filter state with the portfolio, and an SVG fallback. The v0 build landed in Wave 1; the sidebar entry carried a `v0` badge.

The PM did a KEEP/KILL pass against the live preview. The read on Galaxy was *"it gives nothing"*: the portfolio list with filters and stat tiles already delivers the leadership scanning outcome; the dossier delivers the per-project deep-dive; nobody — no stakeholder, no UR participant, no leadership ask — has surfaced "I want to see all projects spatially." Custom canvas/WebGL is ongoing engineering cost and shipping it without evidence reverses the team's *outcome over output* principle.

## Options considered

1. **Keep building.** Add lens onboarding, an SVG-fallback tour, e2e at MED priority. Rejected: no recorded user demand to justify the next chunk of canvas effort.
2. **Defer indefinitely behind a feature flag.** Hide the surface, keep the code. Rejected: leaves dead code in the bundle, drags on typecheck and test runs, pretends a future decision is made.
3. **Kill cleanly (chosen).** Delete the route, components, library, tests, navigation, cross-references, and analytics events. Archive the capability spec. Record the kill here so a future request to re-build finds the prior reasoning.

## Decision rationale — option 3

- **Product Manager challenge:** the user-value link was thin from the start ("see clusters, gaps, and outliers at a glance" was a designer hypothesis, never a stakeholder request). The portfolio list + filters + stat tiles delivers the spotting-clusters outcome on a smaller cognitive load.
- **Lead Developer feasibility:** the deletion is mechanical. No other capability imports from `lib/galaxy/` (verified by grep). The analytics catalogue change drops two events and a `DossierOpenedSource` union member. TypeScript will catch any accidental cross-reference at the next build.
- **Information Architect view:** the sidebar Galaxy entry is the only inbound nav link; removing it doesn't orphan any surface. The bookmarked-URL risk is theoretical (Galaxy was a v0 surface in a preview environment).
- **Service Designer view:** the design-and-research assessment (`design-reviews/2026-05-02-design-and-research-assessment.md`) already flagged Galaxy as "a research artefact in production clothing" with no UR validation. Killing it before the first round of UR (PR #88) means the UR sample isn't burned on a surface the PM has already removed from the product.

## Consequences

- The route `/galaxy` returns 404 from the next deploy. No redirect is added.
- `openspec/specs/galaxy-view/` is archived via the change flow when the PR merges; the directory is not deleted manually.
- `openspec/specs/analytics/spec.md` shrinks the closed-event catalogue by two entries; `lib/analytics/events.ts` mirrors that change. The mechanism (closed catalogue, type-checked names, build-fails-on-undeclared-event) is unchanged.
- The Sidebar `Galaxy` nav entry, the portfolio spec's "Galaxy view" link, the reference-data spec's "galaxy view" mention, the engineering-team multi-surface example, `architecture/containers.md`, `CLAUDE.md`, and `openspec/config.yaml` are all updated in the same change.
- The seed-demo script (PR #94) drops the `demo-learning-galaxy-explained` learning item and the `demo-event-galaxy-demo` event in a follow-up commit.
- `decisions/2026-05-02-e2e-coverage-prioritisation.md` keeps the Galaxy row in the priority matrix (the matrix is a snapshot) with the priority cell replaced by `KILLED 2026-05-02`.
- `design-reviews/2026-05-02-design-and-research-assessment.md` keeps every Galaxy-related finding as written and gains a one-line note at the top recording the kill.
- No analytics-event history is touched. Events already in PostHog under `galaxy_lens_changed` / `galaxy_overlay_toggled` remain. The catalogue change prevents *new* emissions only.
- No other capability depends on Galaxy. `portfolio-management`, `project-dossier`, `analytics`, `reference-data`, `engineering-team` lose only their textual cross-references, not any behaviour.

## Reversal triggers

Reopen this kill when **any** of the following becomes true:

1. A stakeholder (DTS Crime leadership, comms, or a delivery team) explicitly asks for a spatial / constellation visualisation of the portfolio, by name or by the underlying outcome.
2. UR sessions (PR #88 onward) surface "I want to see all projects spatially" or an equivalent — said without being prompted by the surface itself.
3. The portfolio grows past a size where list + filter + stat-tile UX visibly breaks down. With ~12 demo projects and a roadmap of tens of projects in v1, this is currently no risk.

If reopened, the change proposal SHALL link to this decision and either re-derive the user-outcome justification from a recorded stakeholder ask / UR finding, or carry an explicit re-open of the KEEP/KILL pass.

## Cross-references

- `openspec/changes/remove-galaxy-view-capability/` — the OpenSpec change folder.
- `decisions/2026-05-02-e2e-coverage-prioritisation.md` — Galaxy row marked `KILLED 2026-05-02`.
- `design-reviews/2026-05-02-design-and-research-assessment.md` — one-line note at the top; findings preserved.
- `openspec/specs/engineering-team/spec.md` — *Decision arbiters at each level* (PM owns "whole-team outcome, scope, priority") and *Outcome over output* (the PM may decide to remove a feature when the outcome isn't being delivered).
