import { expect, test } from "@playwright/test";

import {
  dossiers,
  projects,
  sampleReferenceData,
} from "../fixtures/project-fixtures";
import { installSanityMocks } from "../fixtures/sanity-mock";
import { signIn } from "../fixtures/sign-in";

/**
 * Retro action item 2 — first batch of e2e tests.
 *
 * Covers the brief's test 4: dossier render. Navigates to a fixture
 * project's dossier route. Asserts the headline sections render and the
 * Portable Text update body appears (proving the rich-text renderer is
 * wired up).
 */
test("project dossier renders header, governance, and a Portable Text update", async ({ page }) => {
  await installSanityMocks(page, [
    { fragment: '_type == "previewSession"', result: null },
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: '_type == "action"', result: sampleReferenceData.actions },
    // The dossier query is the more specific "_id == $id" projection;
    // it's listed first so the matcher takes it before any broader
    // `_type == "project"` rule could swallow it.
    { fragment: "_id == $id", result: dossiers.alpha },
  ]);

  await signIn(page, { next: `/portfolio/${projects.alpha._id}` });

  // Title (h1).
  await expect(page.getByRole("heading", { name: dossiers.alpha.name, level: 1 })).toBeVisible();

  // Stage pill ("Pilot") and tier badge ("Tier 2") rendered by
  // DossierHeader. "Tier 2" also appears as a detail label inside the
  // governance AssuranceChip, so we scope to the first occurrence —
  // the DossierHeader badge.
  await expect(page.getByText("Pilot", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tier 2", { exact: true }).first()).toBeVisible();

  // Headline sections.
  await expect(page.getByRole("heading", { name: "Governance and assurance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Updates" })).toBeVisible();

  // The seeded update has title and Portable Text body; both should be
  // visible after the renderer runs.
  await expect(page.getByRole("heading", { name: "Pilot wave 1 complete" })).toBeVisible();
  await expect(
    page.getByText("Two courts onboarded; jury bundle triage time down 38%."),
  ).toBeVisible();
});
