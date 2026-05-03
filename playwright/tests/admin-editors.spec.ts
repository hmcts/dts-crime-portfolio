import { expect, test } from "@playwright/test";

import { installBaselineMocks, signIn } from "../fixtures/sign-in";

/**
 * Smoke e2e for the Editor allowlist admin surface.
 *
 * Spec: openspec/specs/access-control/spec.md (Admin) and
 * decisions/2026-05-03-editor-allowlist-claude-design-brief.md.
 *
 * Two cases:
 *  1. A non-admin viewer hits a forbidden panel — no form is rendered.
 *  2. An admin (whose email is in ADMIN_ALLOWLIST for the test runner)
 *     sees the page chrome (heading + form + table empty state).
 *
 * The behavioural CRUD path is covered by the Drizzle-backed unit
 * tests on the resolver and the API routes' lifecycle smoke; we
 * deliberately don't seed Postgres rows from this spec.
 */
test("admin editors: viewer sees forbidden panel", async ({ page }) => {
  await installBaselineMocks(page, [
    { fragment: '_type == "project"', result: { total: 0, filtered: [] } },
  ]);
  await signIn(page, { next: "/admin/editors" });
  await expect(
    page.getByRole("heading", { name: "Admin access required" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
});

test("admin editors: admin sees the page chrome and empty allowlist", async ({
  page,
}) => {
  // The admin page calls listProjects() server-side, which hits the
  // mocked Sanity layer. Install an empty project list so the call
  // resolves cleanly.
  await installBaselineMocks(page, [
    { fragment: '_type == "project"', result: { total: 0, filtered: [] } },
  ]);
  // The preview-auth fixture lets the admin in via x-user-email; the
  // ADMIN_ALLOWLIST env injects the same email at process boot, so the
  // resolver returns isAdmin=true without any DB hit.
  await signIn(page, {
    next: "/admin/editors",
    // Matches ADMIN_ALLOWLIST in playwright.config.ts.
    email: "editor@hmcts.net",
  });
  await expect(
    page.getByRole("heading", { name: "Editor allowlist" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Grant edit access/i })).toBeVisible();
  // Use exact-match labels so the filter input ("Filter by email or
  // project") doesn't collide with "Email" / "Project" via substring.
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Project", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/No editors granted yet/i),
  ).toBeVisible();
});
