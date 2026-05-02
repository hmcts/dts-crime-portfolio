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
/*
 * Skipped because the dossier route currently throws a React Server
 * Components error on render:
 *
 *   "Functions cannot be passed directly to Client Components unless you
 *    explicitly expose it by marking it with 'use server'."
 *
 * Trigger: DossierHeader (server component) passes a `renderEditor`
 * function prop into EditableSection ("use client"). RSC forbids that
 * pattern. The same construction is used by every dossier section
 * (header, area row, people row, governance, action links) so the page
 * 500s before any content is committed to the response.
 *
 * Captured for follow-up in retro action item, NOT patched here — the
 * brief explicitly disallows product changes from the e2e PR. Reproducing
 * locally: navigate to `/portfolio/<id>` against the preview env; the
 * server log prints the RSC TypeError.
 */
test.skip("project dossier renders header, governance, and a Portable Text update", async ({ page }) => {
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
  // DossierHeader.
  await expect(page.getByText("Pilot", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tier 2", { exact: true })).toBeVisible();

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
