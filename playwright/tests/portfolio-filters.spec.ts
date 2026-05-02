import { expect, test } from "@playwright/test";

import { projects, sampleReferenceData } from "../fixtures/project-fixtures";
import { installSanityMocks } from "../fixtures/sanity-mock";
import { signIn } from "../fixtures/sign-in";

/**
 * Wave 2 retro action 5 Phase 2 (2/4) — Portfolio filter interactions.
 *
 * The existing `portfolio-list.spec.ts` covers default render and the
 * `portfolio-empty.spec.ts` covers the empty state, but nothing exercises
 * the *filter* contract: click a filter button → URL updates → server
 * re-renders the list with the narrower set → "Clear filters" restores
 * the full list. A regression here looks like "filters silently do
 * nothing" — exactly the kind of bug a user sees but no signal catches.
 *
 * The portfolio LIST query takes bind parameters (`$stages`, `$groupIds`,
 * `$tiers`, etc.) so the same fragment can serve unfiltered and filtered
 * responses; we use the mock layer's `paramsEqual` field to differentiate.
 */
test("portfolio filters: clicking Stage narrows the list, Clear filters restores it", async ({
  page,
}) => {
  const all = [projects.alpha, projects.beta, projects.gamma];
  const onlyPilot = [projects.alpha]; // alpha.projectStage === "pilot"

  await installSanityMocks(page, [
    { fragment: '_type == "previewSession"', result: null },
    // Filter dropdown sources.
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: '_type == "action"', result: sampleReferenceData.actions },

    // *Specific* match first: when the query binds `stages = ["pilot"]`,
    // return only the pilot project. Without the more-specific entry
    // first, the unfiltered fallback below would swallow it.
    {
      fragment: '_type == "project"',
      paramsEqual: { stages: ["pilot"] },
      result: { total: all.length, filtered: onlyPilot },
    },
    // Fallback for the no-filter case (and any other filter combination
    // not explicitly mocked).
    {
      fragment: '_type == "project"',
      result: { total: all.length, filtered: all },
    },
  ]);

  await signIn(page, { next: "/portfolio" });

  // 1. All three projects render initially.
  await expect(
    page.getByText(`Showing ${all.length} of ${all.length} projects`),
  ).toBeVisible();
  for (const project of all) {
    await expect(
      page.getByRole("heading", { name: project.name, level: 2 }),
    ).toBeVisible();
  }
  // No "Clear filters" link yet — filters are inactive.
  await expect(page.getByRole("link", { name: "Clear filters" })).toHaveCount(0);

  // 2. Click the "Pilot" stage filter. ToggleFilterButton uses
  //    aria-pressed; the visible label is the STAGE_LABELS["pilot"]
  //    value, "Pilot".
  const pilotToggle = page.getByRole("button", { name: "Pilot", exact: true }).first();
  await expect(pilotToggle).toHaveAttribute("aria-pressed", "false");
  await pilotToggle.click();

  // 3. URL gains ?stage=pilot.
  await page.waitForURL(/[?&]stage=pilot/);
  await expect(page).toHaveURL(/[?&]stage=pilot/);

  // 4. The summary updates to "Showing 1 of 3 projects" — i.e. the
  //    filtered count differs from the total.
  await expect(
    page.getByText(`Showing ${onlyPilot.length} of ${all.length} projects`),
  ).toBeVisible();

  // Only alpha is rendered now.
  await expect(
    page.getByRole("heading", { name: projects.alpha.name, level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: projects.beta.name, level: 2 }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: projects.gamma.name, level: 2 }),
  ).toHaveCount(0);

  // The Pilot toggle now reports aria-pressed=true.
  await expect(
    page.getByRole("button", { name: "Pilot", exact: true }).first(),
  ).toHaveAttribute("aria-pressed", "true");

  // 5. "Clear filters" link appears (top-right) and resets the query.
  const clearLink = page.getByRole("link", { name: "Clear filters" }).first();
  await expect(clearLink).toBeVisible();
  await clearLink.click();

  await page.waitForURL((url) => url.pathname === "/portfolio" && url.search === "");
  await expect(page).toHaveURL(/\/portfolio$/);

  // 6. All three projects render again; the Clear-filters link is gone.
  await expect(
    page.getByText(`Showing ${all.length} of ${all.length} projects`),
  ).toBeVisible();
  for (const project of all) {
    await expect(
      page.getByRole("heading", { name: project.name, level: 2 }),
    ).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Clear filters" })).toHaveCount(0);
});
