import { expect, test } from "@playwright/test";

import {
  projects,
  sampleReferenceData,
} from "../fixtures/project-fixtures";
import { installSanityMocks } from "../fixtures/sanity-mock";
import { signIn } from "../fixtures/sign-in";

/**
 * Retro action item 2 — first batch of e2e tests.
 *
 * Covers the brief's test 3: portfolio with mocked Sanity. Two projects
 * across two stages so the cards render with title + stage badge.
 *
 * Note on tier badge — the brief asked for "title + stage badge + tier
 * badge" on cards. The current ProjectCard does not render a Tier badge
 * (tier is rendered in the dossier header instead). Asserting on stage
 * here, asserting on tier in the dossier test. Called out in the PR's
 * "What's NOT in this PR" section.
 */
test("portfolio renders project cards from a mocked Sanity response", async ({ page }) => {
  const fixtureProjects = [projects.alpha, projects.gamma];

  await installSanityMocks(page, [
    { fragment: '_type == "previewSession"', result: null },
    // Reference-data lookups that the filter row consumes.
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: '_type == "action"', result: sampleReferenceData.actions },
    // Portfolio list query returns the aggregated `{ total, filtered }`
    // shape from lib/portfolio/queries.ts.
    {
      fragment: '_type == "project"',
      result: { total: fixtureProjects.length, filtered: fixtureProjects },
    },
  ]);

  await signIn(page, { next: "/portfolio" });

  // Header summary reflects the count.
  await expect(
    page.getByText(`Showing ${fixtureProjects.length} of ${fixtureProjects.length} projects`),
  ).toBeVisible();

  // Each card renders the title (h2) and a stage badge with the right label.
  for (const project of fixtureProjects) {
    await expect(page.getByRole("heading", { name: project.name, level: 2 })).toBeVisible();
  }

  // Stage labels — "Pilot" for alpha, "Scale" for gamma — are rendered
  // through StagePill (lib/enums/stage.ts STAGE_LABELS).
  await expect(page.getByText("Pilot", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Scale", { exact: true }).first()).toBeVisible();

  // The card is a link target pointing at /portfolio/[id].
  const alphaCard = page.getByRole("link", { name: new RegExp(projects.alpha.name) }).first();
  await expect(alphaCard).toHaveAttribute("href", `/portfolio/${projects.alpha._id}`);
});
