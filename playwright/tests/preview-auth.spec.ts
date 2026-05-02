import { expect, test } from "@playwright/test";

import { installBaselineMocks } from "../fixtures/sign-in";

/**
 * Retro action item 2 — first batch of e2e tests.
 *
 * Covers the brief's test 1: preview-auth flow.
 *  - submit a form-allowed email
 *  - assert redirect into the app and that the signed cookie is set
 *  - navigate to a protected route and assert no re-prompt
 *
 * Plus a second test covering the domain restriction added in
 * `restrict-preview-auth-to-hmcts-domains`: a non-HMCTS / non-justice
 * email is rejected with an inline error and the page does not
 * navigate.
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

  // 2. Submit a valid HMCTS email; the server action signs a cookie and
  // redirects to `next`.
  await page.getByLabel("Email").fill("tester@hmcts.net");
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

test("preview-auth: rejected non-HMCTS email shows inline error and does not navigate", async ({
  page,
  context,
}) => {
  await installBaselineMocks(page);

  await page.goto("/preview-auth?next=%2Fportfolio");
  await expect(page.getByRole("heading", { name: "Sign in to the preview" })).toBeVisible();

  // Use a domain that is not on the allowlist. The client component
  // intercepts on submit and shows an inline error before any network
  // call. The form still has `noValidate` so submission is reached.
  await page.getByLabel("Email").fill("tester@example.com");
  await page.getByRole("button", { name: "Continue" }).click();

  // We are still on the sign-in page — no navigation occurred.
  await expect(page).toHaveURL(/\/preview-auth/);
  await expect(page.getByRole("heading", { name: "Sign in to the preview" })).toBeVisible();

  // Inline error names the allowed domains. Scope by id because Next.js
  // injects a route-announcer with role="alert" that would otherwise
  // collide with this locator under strict mode.
  const error = page.locator("#email-error");
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("role", "alert");
  await expect(error).toContainText("@hmcts.net");
  await expect(error).toContainText("@justice.gov.uk");

  // No previewAuth cookie was set.
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "previewAuth")).toBeUndefined();
});
