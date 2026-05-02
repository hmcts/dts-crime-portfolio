import { expect, test } from "@playwright/test";

import { installBaselineMocks } from "../fixtures/sign-in";

/**
 * Retro action item 2 — first batch of e2e tests.
 *
 * Covers the brief's test 1: preview-auth flow.
 *  - submit a form-allowed email
 *  - assert redirect into the app and that the signed cookie is set
 *  - navigate to a protected route and assert no re-prompt
 */
test("preview-auth flow: sign in, set cookie, navigate to a protected route without re-prompt", async ({
  page,
  context,
}) => {
  // Baseline mocks plus an empty portfolio list so the post-sign-in
  // landing page renders cleanly rather than 500ing on a null response.
  await installBaselineMocks(page, [
    { fragment: '_type == "project"', result: { total: 0, filtered: [] } },
  ]);

  // 1. Unauthenticated request to /portfolio bounces to the sign-in form.
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/preview-auth\?next=%2Fportfolio/);
  await expect(page.getByRole("heading", { name: "Sign in to the preview" })).toBeVisible();

  // 2. Submit a valid email; the server action signs a cookie and redirects
  // to `next`.
  await page.getByLabel("Email").fill("tester@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((url) => url.pathname === "/portfolio");

  // The signed previewAuth cookie is now set, HttpOnly and scoped to /.
  const cookies = await context.cookies();
  const previewAuth = cookies.find((cookie) => cookie.name === "previewAuth");
  expect(previewAuth, "previewAuth cookie should be set after sign-in").toBeTruthy();
  expect(previewAuth?.httpOnly).toBe(true);
  expect(previewAuth?.value ?? "").not.toBe("");

  // 3. Direct navigation to another protected route — /help — must not
  // re-prompt: we should land on /help, not bounce back to /preview-auth.
  await page.goto("/help");
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole("heading", { name: "Help", level: 1 })).toBeVisible();
});
