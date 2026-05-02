import { expect, test } from "@playwright/test";

import { installBaselineMocks, signIn } from "../fixtures/sign-in";

/**
 * Retro action item 2 — first batch of e2e tests.
 *
 * Covers the brief's test 2: portfolio empty state. The mocked Sanity
 * portfolio query returns `{ total: 0, filtered: [] }`; we assert the
 * empty-state copy renders, no project cards exist, and no JS errors are
 * thrown into the browser console.
 */
test("portfolio renders the empty state when there are no projects", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await installBaselineMocks(page, [
    {
      fragment: '_type == "project"',
      result: { total: 0, filtered: [] },
    },
  ]);
  await signIn(page, { next: "/portfolio" });

  // Header summary reflects the zero-project case.
  await expect(page.getByText("No projects yet.")).toBeVisible();

  // Empty-state body invites submission. The CTA button is the New Project
  // link pointing at /portfolio/submit.
  await expect(page.getByText("No projects to show yet.")).toBeVisible();
  const newProject = page.getByRole("link", { name: "New Project" });
  await expect(newProject).toBeVisible();
  await expect(newProject).toHaveAttribute("href", "/portfolio/submit");

  // No project cards are rendered. The list view uses <h2> for project
  // names; in the empty state none should exist.
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
