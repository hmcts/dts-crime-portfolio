## Why

The Product Manager has decided to kill the `galaxy-view` capability. The
verbatim reason is *"it gives nothing."* Galaxy was specified as a zoomable
canvas constellation map of every project with a lens switcher (Capability,
Stage, Business area, Delivery area, Governance) and signal overlays
(Compliance gaps, Updated in 7 days, No update in 30 days). It was built to
v0 with a custom 2D canvas, force-directed layout, an SVG fallback, and URL
state shared with the portfolio.

There is no recorded user-research signal that anyone wanted a spatial /
constellation visualisation of the portfolio. PR #88 has the first round of
moderated UR pending; killing this surface now reduces the test matrix and
the production bundle without removing any *recorded* user value. The Lead
Developer concurs that removal is mechanical (no other capability depends
on Galaxy code paths); the Information Architect confirms no surface loses
navigation; the Service Designer confirms no UR finding is lost.

Full reasoning, options considered, and reversal triggers are in
[`decisions/2026-05-02-kill-galaxy-view.md`](../../../decisions/2026-05-02-kill-galaxy-view.md).

## What Changes

1. Remove every requirement from the `galaxy-view` capability. The route
   `/galaxy`, the `GalaxyView` client component, the supporting library
   (`lib/galaxy/`), the unit tests under `tests/galaxy-*`, the sidebar
   nav entry, and any cross-capability references to "open in galaxy"
   are removed from the codebase in the same change.
2. Modify the `analytics` capability's *Closed event catalogue*
   requirement to drop `galaxy_lens_changed` and `galaxy_overlay_toggled`
   from the catalogue. The mechanism (closed catalogue, type-checked
   names, build-fails-on-undeclared-event) is unchanged — the catalogue
   list shrinks by two entries and `lib/analytics/events.ts` mirrors
   the new spec.

The kill is clean — no feature flag, no dead code left behind, no
deferral. If a future request surfaces for a spatial portfolio
visualisation, the decision-log records the reversal triggers.

## Capabilities

### Removed Capabilities

- `galaxy-view`: zoomable, pannable canvas constellation map of every
  project, with lens switcher, signal overlays, search, shared filters,
  legend with focus, camera controls, per-lens layout cache, and an SVG
  fallback. No replacement.

### Modified Capabilities

- `analytics`: the *Closed event catalogue* requirement loses the two
  `galaxy_*` events. Every other catalogue entry, every PII-minimisation
  requirement, the consent gate, the proxy, and the hashed-userId
  identification all stay exactly as specified.

### New Capabilities

None.

## Impact

- **Code removed:** `app/(app)/galaxy/`, `components/galaxy/`,
  `lib/galaxy/`, `tests/galaxy-*.test.ts`, the sidebar `Galaxy` nav
  entry, and the two `galaxy_*` entries (plus `"galaxy"` from the
  `DossierOpenedSource` union) in `lib/analytics/events.ts`.
- **Spec removed:** `openspec/specs/galaxy-view/` (removed via the
  archive flow when this change is archived; not deleted manually here).
- **Spec modified:** `openspec/specs/analytics/spec.md` catalogue list.
- **Doc / cross-reference updates:** `README.md`, `CLAUDE.md`,
  `architecture/containers.md`, `openspec/config.yaml`,
  `openspec/specs/portfolio-management/spec.md`,
  `openspec/specs/reference-data/spec.md`,
  `openspec/specs/engineering-team/spec.md`, the e2e prioritisation
  decision (Galaxy row marked KILLED 2026-05-02), the design-and-research
  assessment (one-line update note at the top), and the seed-demo script
  + docs (separate commit on PR #94's branch).
- **Operational:** the `/galaxy` route returns 404 from the next deploy.
  Bookmarked URLs to `/galaxy` or `/galaxy/{id}` will 404 — no redirect
  is added because no recorded user has the surface bookmarked.
- **No data loss.** Galaxy was a read-only visualisation over Sanity
  documents that other capabilities continue to render. No content is
  authored in or against `/galaxy`.
- **No analytics-event history is touched** — events that already
  fired remain in PostHog under the old names. The catalogue change
  prevents *new* events with those names from being emitted.
