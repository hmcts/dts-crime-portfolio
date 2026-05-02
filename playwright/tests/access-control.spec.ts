import { expect, test } from "@playwright/test";

import { dossiers, projects, sampleReferenceData } from "../fixtures/project-fixtures";
import { installSanityMocks } from "../fixtures/sanity-mock";
import { signIn } from "../fixtures/sign-in";

/**
 * Wave 2 retro action 5 Phase 2 (3/4) — Access Control role gating.
 *
 * The access-control spec defines three roles (Viewer, Editor, Admin)
 * and a hard rule: "the browser never writes to Sanity". Mutations go
 * through PATCH /api/portfolios/[id] which checks
 * `!user.isAdmin && !user.editableProjects.includes(id)` and returns
 * 403. Editor and Admin gain inline pencil affordances on the dossier;
 * Viewers do not.
 *
 * This test covers the **Viewer** path end-to-end: no admin allowlist
 * entry, no editor allowlist entry → no edit pencils on the dossier,
 * and the mutation endpoint rejects the request with 403.
 *
 * Editor / Admin paths require a different runtime (ADMIN_ALLOWLIST env
 * needs the test email; the playwright webServer doesn't set this).
 * Documented in this file's "Not in this PR" comment so a follow-up
 * change can extend coverage rather than re-deriving the gap.
 *
 * Spec: openspec/specs/access-control/spec.md (Three-role model;
 * Inline edit affordances by role).
 */
test("access control: Viewer sees no edit pencils and is rejected by PATCH /api/portfolios/[id]", async ({
  page,
}) => {
  // Sample reference data so the dossier renders cleanly; the dossier
  // itself comes from the same fixture used by dossier.spec.ts.
  await installSanityMocks(page, [
    { fragment: '_type == "previewSession"', result: null },
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: '_type == "action"', result: sampleReferenceData.actions },
    { fragment: "_id == $id", result: dossiers.alpha },
  ]);

  // Default sign-in: tester@hmcts.net is a Viewer because no admin
  // allowlist entry exists for it (ADMIN_ALLOWLIST is unset in the
  // playwright webServer env) and no editor mapping exists in the
  // currently-stubbed fetchEditableProjects().
  await signIn(page, { next: `/portfolio/${projects.alpha._id}` });

  // 1. Dossier renders.
  await expect(
    page.getByRole("heading", { name: dossiers.alpha.name, level: 1 }),
  ).toBeVisible();

  // 2. No edit pencils anywhere on the page. PencilButton renders with
  //    aria-label="Edit description" (DossierHeader) and "Edit governance
  //    and assurance" (DossierGovernanceRow). Both must be absent for
  //    a Viewer.
  await expect(
    page.getByRole("button", { name: "Edit description" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit governance and assurance" }),
  ).toHaveCount(0);

  // 3. PATCH /api/portfolios/[id] is rejected with 403. The browser
  //    request carries the same x-user-email that the dossier page
  //    resolved against, so this hits the same auth path.
  const patchRes = await page.request.patch(`/api/portfolios/${projects.alpha._id}`, {
    data: { description: "Viewer should not be able to set this" },
    headers: { "content-type": "application/json" },
  });
  expect(patchRes.status()).toBe(403);
  const body = await patchRes.json().catch(() => ({}));
  expect(body).toMatchObject({ error: expect.stringMatching(/Forbidden/i) });
});

/*
 * Not in this PR:
 *
 *  - Admin path (pencils visible, PATCH succeeds, ChangeLog row written).
 *    Requires ADMIN_ALLOWLIST=tester@hmcts.net in the playwright
 *    webServer env, which is not set by playwright.config.ts. Adding a
 *    second test project that boots its own server with that env is
 *    the cleanest extension; out of scope for this PR.
 *
 *  - Editor path (per-project pencil visibility). Editor allowlist
 *    lookup is currently a stub returning [] in lib/auth/resolver.ts;
 *    a real per-project Editor lookup against Sanity will replace the
 *    stub once an editorAccess schema lands. See
 *    openspec/specs/access-control/spec.md.
 *
 * Both gaps are tracked in decisions/2026-05-02-e2e-coverage-prioritisation.md.
 */
