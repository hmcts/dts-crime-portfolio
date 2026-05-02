import { expect, test } from "@playwright/test";

import { sampleReferenceData } from "../fixtures/project-fixtures";
import { installBaselineMocks, signIn } from "../fixtures/sign-in";

/**
 * Wave 2 retro action 5 Phase 2 (1/4) — Project Submission happy path.
 *
 * The submission form is the highest-priority gap from the coverage sweep
 * recorded in `decisions/2026-05-02-e2e-coverage-prioritisation.md`: a
 * six-section form with tier calculation and a ChangeLog mutation, where
 * a silent regression ships bad submissions to the dataset.
 *
 * Strategy:
 *   - Mock Sanity reads via the existing baseline so reference-data
 *     dropdowns populate.
 *   - Mock POST /api/portfolios/submit at the network layer (page.route)
 *     so the Sanity *write* path is exercised end-to-end at the form
 *     level without standing up a real transaction. The submission
 *     route handler has its own unit test
 *     (`tests/submission-route.test.ts`); this e2e covers the form-fill
 *     and submit-redirect contract specifically.
 *   - Walk all six sections by clicking Next, filling required fields
 *     only.
 *   - Assert the redirect lands on `/portfolio/{id}` with the id we
 *     mocked the route to return.
 */
test("project submission happy path: fill six sections, submit, redirect to dossier", async ({
  page,
}) => {
  // Reference-data is read by the page server-side via Sanity; the dossier
  // landing page after submit also reads via Sanity. The baseline helper
  // defaults to *empty* reference data, so override the dropdown fragments
  // with sample data — caller fragments take precedence over the empty
  // defaults.
  await installBaselineMocks(page, [
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: "_id == $id", result: { _id: "project-new", name: "AI Triage" } },
  ]);

  // Intercept the POST submission so the test does not need a real
  // Sanity write. The route handler has its own unit-level coverage at
  // tests/submission-route.test.ts; this e2e covers the form-fill and
  // submit-redirect contract specifically.
  //
  // We capture the payload outside the handler so any assertions can run
  // *after* fulfil — otherwise an expect() failure inside the handler
  // hangs the request and the form sits stuck on "Submitting…".
  type SubmittedBody = {
    name?: string;
    projectStage?: string;
    declaredOverallTier?: number;
    tieringAssessment?: Record<string, unknown>;
  };
  const capturedBodies: SubmittedBody[] = [];
  await page.route("**/api/portfolios/submit", async (route) => {
    if (route.request().method() === "POST") {
      capturedBodies.push(route.request().postDataJSON() as SubmittedBody);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, projectId: "project-new" }),
      });
      return;
    }
    await route.continue();
  });

  await signIn(page, { next: "/portfolio/submit" });
  await expect(
    page.getByRole("heading", { name: "Submit a project" }),
  ).toBeVisible();

  // Section 1 — Tiering. Pick Tier 1 for every question. The radios
  // render in option order so .first() = Tier 1.
  const tieringKeys = [
    "natureOfApplication",
    "reach",
    "thirdPartyInvolvement",
    "ownership",
    "publicTrustImplications",
    "legalRegulatoryImplications",
    "technicalComplexity",
    "automatedDecisionMaking",
    "typeOfData",
    "dataStorage",
  ];
  for (const key of tieringKeys) {
    await page.locator(`input[name="tiering-${key}"]`).first().check();
  }
  await expect(page.getByText(/Running tier:\s*Tier 1/)).toBeVisible();

  await page.getByRole("button", { name: /Next: Project basics/ }).click();

  // Section 2 — Project basics.
  await page.getByLabel("Project name", { exact: false }).fill("AI Triage");
  await page.getByLabel("Description").fill("Triage tooling for crown court bundles.");
  await page.locator('input[name="projectStage"][value]').first(); // sanity: projectStage radios exist
  await page.getByText("Pilot", { exact: true }).first().click();

  await page.getByRole("button", { name: /Next: Ownership/ }).click();

  // Section 3 — Ownership. SearchableSelect: type query, click matching option.
  // Note the option labels include parenthetical context (e.g. directorates
  // show "(group)" suffix; people show "(email)" suffix) — see the
  // useMemo'd directorateOptions / peopleOptions in SubmissionForm.tsx.
  await selectSearchable(page, "group", "Crime", "Crime");
  await selectSearchable(page, "directorate", "Crime Tech", "Crime Tech (Crime)");
  // Multi-select for business areas — type then click the option button.
  await page.locator("#businessAreas").fill("Courts");
  await page.getByRole("button", { name: "Courts", exact: true }).first().click();
  // Delivery owner — pick existing person; label includes email.
  await selectSearchable(
    page,
    "deliveryOwner",
    "Alice",
    "Alice Owner (alice@example.gov.uk)",
  );

  await page.getByRole("button", { name: /Next: Capability/ }).click();

  // Section 4 — Capability.
  await selectSearchable(
    page,
    "capability",
    "Summarisation",
    sampleReferenceData.capabilities[0].name,
  );

  await page.getByRole("button", { name: /Next: Governance/ }).click();

  // Section 5 — Governance. All fields optional; just advance.
  await page.getByRole("button", { name: /Next: Updates/ }).click();

  // Section 6 — Updates. Optional; submit straight from the review state.
  await page.getByRole("button", { name: "Submit", exact: true }).click();

  // The form POSTs, the mock returns { ok: true, projectId: "project-new" },
  // and router.push lands the browser on the dossier route.
  await page.waitForURL((url) => url.pathname === "/portfolio/project-new");
  await expect(page).toHaveURL(/\/portfolio\/project-new$/);

  // Validate the submitted payload after-the-fact so an assertion failure
  // doesn't deadlock the form.
  expect(capturedBodies).toHaveLength(1);
  const body = capturedBodies[0];
  expect(body).toMatchObject({
    name: "AI Triage",
    projectStage: "pilot",
    declaredOverallTier: 1,
  });
  expect(body.tieringAssessment).toBeTruthy();
});

/**
 * Drive a SearchableSelect: focus the input by id, type the query, click
 * the matching option button.
 */
async function selectSearchable(
  page: import("@playwright/test").Page,
  inputId: string,
  query: string,
  optionLabel: string,
): Promise<void> {
  const input = page.locator(`#${inputId}`);
  await input.fill(query);
  await page.getByRole("button", { name: optionLabel, exact: true }).click();
}
