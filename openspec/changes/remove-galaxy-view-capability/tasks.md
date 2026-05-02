## 1. Decision-log and change folder

- [ ] 1.1 Add `decisions/2026-05-02-kill-galaxy-view.md` recording the
      Product Manager's verbatim reason ("it gives nothing.") and the
      Lead Developer / Information Architect / Service Designer concurrences
- [ ] 1.2 Add this change folder under
      `openspec/changes/remove-galaxy-view-capability/` with `.openspec.yaml`,
      `README.md`, `proposal.md`, `tasks.md`, and the two delta specs
- [ ] 1.3 Validate with `openspec validate remove-galaxy-view-capability --strict`

## 2. Test deletions (leaves first)

- [ ] 2.1 Delete `tests/galaxy-capability.test.ts`
- [ ] 2.2 Delete `tests/galaxy-filter.test.ts`
- [ ] 2.3 Delete `tests/galaxy-lenses.test.ts`
- [ ] 2.4 Delete `tests/galaxy-signals.test.ts`
- [ ] 2.5 Delete `tests/galaxy-url.test.ts`

## 3. Component and library deletions

- [ ] 3.1 Delete `components/galaxy/` (GalaxyView, GalaxyCanvas,
      GalaxyFallbackSvg, GalaxyLegend, GalaxyLensSelector,
      GalaxyOverlayPanel, GalaxySearchBox)
- [ ] 3.2 Delete `lib/galaxy/` (capability, filter, forceLayout, lens,
      lenses, list, signals, simulation, types, url)
- [ ] 3.3 Delete the `app/(app)/galaxy/` route folder

## 4. Navigation and cross-references

- [ ] 4.1 Remove the `{ href: "/galaxy", label: "Galaxy", badge: "v0" }`
      entry from `components/shell/Sidebar.tsx`
- [ ] 4.2 Remove the "Galaxy view" link mentioned in
      `openspec/specs/portfolio-management/spec.md` (Portfolio card grid
      requirement) and the "galaxy view" cross-references in the same
      spec
- [ ] 4.3 Remove the "galaxy view" reference in
      `openspec/specs/reference-data/spec.md` (Cached client-side per
      session requirement)
- [ ] 4.4 Update `openspec/specs/engineering-team/spec.md` to remove
      "galaxy" from the multi-surface-feature example and the
      Technical-Architect "defer canvas/WebGL for galaxy v0" example

## 5. Analytics catalogue

- [ ] 5.1 Remove `galaxy_lens_changed` and `galaxy_overlay_toggled`
      from the `AnalyticsEventMap` and `ANALYTICS_EVENT_NAMES` in
      `lib/analytics/events.ts`
- [ ] 5.2 Remove `"galaxy"` from the `DossierOpenedSource` type union
      in the same file
- [ ] 5.3 Confirm no callsite still emits the removed events
      (`grep -r galaxy_ lib/ app/ components/`)

## 6. Architecture, README, CLAUDE, openspec config

- [ ] 6.1 Drop `galaxy` from the `Pages` node label in
      `architecture/containers.md`
- [ ] 6.2 Drop "galaxy colour map" from the Stage/Tier shared-enums
      bullet in `CLAUDE.md`
- [ ] 6.3 Drop the `galaxy-view (constellation map)` mention and the
      "Custom canvas/WebGL for the Galaxy view" tech-stack bullet from
      `openspec/config.yaml`

## 7. Decision artefacts

- [ ] 7.1 Replace the priority cell of the "Galaxy View" row in
      `decisions/2026-05-02-e2e-coverage-prioritisation.md` with
      `KILLED 2026-05-02` (do not delete the row)
- [ ] 7.2 Add a one-line "Update 2026-05-02" note at the top of
      `design-reviews/2026-05-02-design-and-research-assessment.md`
      pointing at the decision; leave galaxy findings intact

## 8. Verification

- [ ] 8.1 `pnpm exec tsc --noEmit` clean
- [ ] 8.2 `pnpm exec eslint .` clean
- [ ] 8.3 `pnpm test` (Vitest) all green
- [ ] 8.4 `pnpm test:e2e` (Playwright) all green
- [ ] 8.5 `openspec validate remove-galaxy-view-capability --strict`
      passes

## 9. Seed-demo follow-up (separate commit)

- [ ] 9.1 On the `add-seed-demo-script` follow-up branch, drop the
      `demo-learning-galaxy-explained` learning item and the
      `demo-event-galaxy-demo` event from `scripts/seed-demo.ts`
- [ ] 9.2 Update the document counts in `docs/seeding-demo-data.md`
      to match (learning items 6 → 5; events 6 → 5)
