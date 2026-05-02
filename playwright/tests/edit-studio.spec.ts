import { expect, test } from "@playwright/test";

import { dossiers, projects, sampleReferenceData } from "../fixtures/project-fixtures";
import { installSanityMocks } from "../fixtures/sanity-mock";
import { signIn } from "../fixtures/sign-in";

/**
 * Wave 2 retro action 5 Phase 3 (1/1) — Edits / Studio happy path.
 *
 * Counterpart to `access-control.spec.ts` (the Viewer path). Signs in as
 * the Admin email surfaced via `ADMIN_ALLOWLIST` in `playwright.config.ts`
 * so both pencils render, exercises the description editor, and verifies
 * the audit contract end-to-end:
 *
 *   - PATCH /api/portfolios/{id} is dispatched with the new description.
 *   - The API returns 200 (no Forbidden / Unauthorized leakage).
 *   - After `router.refresh()` the dossier re-renders with the saved
 *     description visible — proving the read-after-write loop is wired.
 *
 * `lastUpdatedAt` and the per-field ChangeLog row are written inside the
 * `commitWithChangeLog` transaction in the API route. The Sanity-mock
 * layer absorbs both writes via its generic `/data/mutate/` responder
 * (see `playwright/fixtures/sanity-server.ts`); a green PATCH 200 plus a
 * fresh-content render is the e2e guarantee. The transaction shape itself
 * is covered by the route's unit tests under `tests/`.
 *
 * The Admin email is scoped to `editor@hmcts.net` so this test does not
 * elevate `tester@hmcts.net` (the default sign-in email used by every
 * other spec including `access-control.spec.ts`'s Viewer assertions).
 *
 * Spec: openspec/specs/edit-studio/spec.md (Inline edit affordances by
 * role; ChangeLog write per save; lastUpdatedAt is automatic).
 */
test("edit studio: Admin edits description, PATCH returns 200, dossier re-renders with new content", async ({
  page,
}) => {
  const projectId = projects.alpha._id;
  const updatedDescription =
    "Now scaling crown court bundle triage to two new regions.";

  await installSanityMocks(page, [
    { fragment: '_type == "previewSession"', result: null },
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: '_type == "action"', result: sampleReferenceData.actions },
    // The route's PROJECT_FOR_PATCH_QUERY hits `_type == "project" && _id == $id`;
    // the dossier render hits the broader `_id == $id` projection. Both are
    // matched by the same fragment in declaration order.
    { fragment: "_id == $id", result: dossiers.alpha },
  ]);

  // Sign in as the Admin email (matches ADMIN_ALLOWLIST in
  // playwright.config.ts). The default `tester@hmcts.net` would land
  // here as a Viewer and the pencils would not render.
  await signIn(page, { email: "editor@hmcts.net", next: `/portfolio/${projectId}` });

  // Dossier renders with both pencils visible — Admin role gating works.
  await expect(
    page.getByRole("heading", { name: dossiers.alpha.name, level: 1 }),
  ).toBeVisible();
  const descriptionPencil = page.getByRole("button", { name: "Edit description" });
  const governancePencil = page.getByRole("button", {
    name: "Edit governance and assurance",
  });
  await expect(descriptionPencil).toBeVisible();
  await expect(governancePencil).toBeVisible();

  // Open the description editor. The form's aria-label is
  // "Edit project description" so a plain `getByLabel("Description")`
  // would match both the <form> and the textarea — use the textarea
  // role explicitly.
  await descriptionPencil.click();
  const descriptionField = page.getByRole("textbox", { name: "Description" });
  await expect(descriptionField).toBeVisible();
  await expect(descriptionField).toHaveValue(dossiers.alpha.description ?? "");

  await descriptionField.fill(updatedDescription);

  // Swap the dossier fixture so the post-save re-fetch (triggered by
  // `router.refresh()` inside DossierHeaderEditor) returns the saved
  // description. Other fragments stay identical to the install above.
  const updatedDossier = { ...dossiers.alpha, description: updatedDescription };
  await installSanityMocks(page, [
    { fragment: '_type == "previewSession"', result: null },
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: '_type == "action"', result: sampleReferenceData.actions },
    { fragment: "_id == $id", result: updatedDossier },
  ]);

  // Capture the PATCH and trigger the save in the same tick so the
  // waitForResponse promise is registered before the form's fetch fires.
  const [patchResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().endsWith(`/api/portfolios/${projectId}`),
    ),
    page.getByRole("button", { name: "Save" }).click(),
  ]);

  expect(patchResponse.status()).toBe(200);
  expect(patchResponse.request().postDataJSON()).toMatchObject({
    description: updatedDescription,
  });

  // After the save, the editor closes and the dossier re-renders with
  // the new description text inline. The pencil reappears too.
  await expect(page.getByText(updatedDescription)).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit description" })).toBeVisible();
  // Sanity guard: the editor textarea is gone.
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveCount(0);
});
