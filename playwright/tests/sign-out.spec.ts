import { expect, test } from "@playwright/test";

import { installBaselineMocks, signIn } from "../fixtures/sign-in";

/**
 * Wave 2 retro action item 2 — closes the e2e gap behind the sign-out
 * redirect bug fixed in PR #72.
 *
 * The defect: the sign-out route handler returned
 * `NextResponse.redirect(new URL("/preview-auth", request.url))`. On
 * Render, `request.url` reflects the runtime's internal upstream host
 * (https://localhost:10000), so the browser was sent there instead of
 * the public preview URL. The fix returns a 303 with a relative
 * `Location: /preview-auth` so the browser resolves the redirect
 * against the URL it actually called.
 *
 * This e2e exercises the user-visible flow end-to-end: sign in, click
 * Sign out, land on /preview-auth, cookie is gone, and a subsequent
 * request to a protected route bounces back through preview-auth.
 */
test("sign-out flow: clears cookie, lands on /preview-auth, re-prompts on next protected request", async ({
  page,
  context,
}) => {
  await installBaselineMocks(page, [
    { fragment: '_type == "project"', result: { total: 0, filtered: [] } },
  ]);

  await signIn(page);
  await expect(page).toHaveURL(/\/portfolio$/);

  // Sanity-check: the previewAuth cookie is set after sign-in. Without
  // this the rest of the test would silently exercise the wrong state.
  let cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "previewAuth")).toBeTruthy();

  // Two sign-out controls render on this page: one in the
  // PreviewBanner (non-prod-only orange strip) and one in the AppHeader
  // (top-right, on every authenticated page). They post to the same
  // route. Scope to the banner's copy via testid so this assertion is
  // unambiguous under strict mode.
  await page
    .getByTestId("preview-banner")
    .getByRole("button", { name: "Sign out" })
    .click();

  // The redirect MUST land on /preview-auth on the same origin we
  // started from. If the route handler ever regresses to constructing
  // an absolute URL from `request.url`, this assertion catches it
  // because the browser would be sent to localhost:10000 (or the
  // platform's internal host) and Playwright would either fail to
  // navigate or land on the wrong origin.
  await page.waitForURL((url) => url.pathname === "/preview-auth");
  await expect(page).toHaveURL(/\/preview-auth$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to the preview" }),
  ).toBeVisible();

  // Cookie has been deleted by the sign-out handler.
  cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "previewAuth")).toBeUndefined();

  // A request to a protected route now bounces back through
  // preview-auth — i.e. the cookie really is gone, not just hidden.
  await page.goto("/help");
  await expect(page).toHaveURL(/\/preview-auth\?next=%2Fhelp/);
});

test("sign-out: GET on /preview-auth/sign-out is rejected (POST-only)", async ({
  page,
  context,
}) => {
  // The handler returns 405 Allow: POST for GET. Verifying via the
  // browser is the most honest signal — a typo in a link or someone
  // bookmarking the URL must not silently sign anyone out.
  await installBaselineMocks(page, [
    { fragment: '_type == "project"', result: { total: 0, filtered: [] } },
  ]);
  await signIn(page);

  const response = await page.request.get("/preview-auth/sign-out");
  expect(response.status()).toBe(405);
  expect(response.headers()["allow"]).toBe("POST");

  // Cookie is still there — GET did not sign the user out.
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "previewAuth")).toBeTruthy();
});
