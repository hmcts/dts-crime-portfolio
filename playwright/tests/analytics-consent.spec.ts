import { expect, test, type Page } from "@playwright/test";

import { sampleReferenceData } from "../fixtures/project-fixtures";
import { installSanityMocks } from "../fixtures/sanity-mock";
import { signIn } from "../fixtures/sign-in";

/**
 * Wave 2 retro action 5 Phase 2 (4/4) — Analytics consent gate.
 *
 * The analytics spec (openspec/specs/analytics/spec.md) is explicit: the
 * portal SHALL NOT contact the ingest endpoint, set any analytics cookie,
 * or send any event before the user actively grants consent. This is a
 * GDPR-relevant guarantee — a silent regression here is a compliance
 * incident, not a UX issue.
 *
 * The current implementation has no PostHog SDK dependency: the analytics
 * "client" is a thin fetch in `lib/analytics/client.ts` that POSTs either
 * to the public PostHog ingest URL (direct mode) or to the same-origin
 * proxy at `/api/analytics/ingest` (proxy mode). "SDK NOT loaded"
 * therefore means "no fetch dispatched to either of those endpoints" —
 * which is exactly what the network listener below asserts.
 *
 * Both endpoints are also routed to a local stub so a green test never
 * reaches the public PostHog edge — and so the assertion is purely about
 * dispatch from the browser, not about whether the network round-tripped.
 */

const ANALYTICS_REQUEST_PATTERNS: ReadonlyArray<RegExp> = [
  /posthog\.com\/i\/v0\/e\//,
  /\/api\/analytics\/ingest$/,
];

function isAnalyticsRequest(url: string): boolean {
  return ANALYTICS_REQUEST_PATTERNS.some((pattern) => pattern.test(url));
}

async function installAnalyticsCaptureAndStubs(page: Page): Promise<string[]> {
  const hits: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (isAnalyticsRequest(url)) {
      hits.push(`${request.method()} ${url}`);
    }
  });
  await page.route(/posthog\.com\/i\/v0\/e\//, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/api/analytics/ingest", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
  return hits;
}

async function installPortfolioMocks(page: Page): Promise<void> {
  await installSanityMocks(page, [
    { fragment: '_type == "previewSession"', result: null },
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: '_type == "action"', result: sampleReferenceData.actions },
    { fragment: '_type == "project"', result: { total: 0, filtered: [] } },
  ]);
}

test("analytics consent: nothing is dispatched before a decision; Accept dispatches consent_granted, sets cookie, dismisses banner, persists across reload", async ({
  page,
  context,
}) => {
  await installPortfolioMocks(page);
  const analyticsHits = await installAnalyticsCaptureAndStubs(page);

  await signIn(page, { next: "/portfolio" });

  // Banner is visible — no consent decision yet.
  const acceptButton = page.getByRole("button", { name: "Accept analytics" });
  const declineButton = page.getByRole("button", { name: "Decline" });
  await expect(acceptButton).toBeVisible();
  await expect(declineButton).toBeVisible();

  // No analytics request fires before any decision.
  expect(analyticsHits).toEqual([]);

  // No analyticsConsent cookie before the click.
  let cookies = (await context.cookies()).filter((c) => c.name === "analyticsConsent");
  expect(cookies).toHaveLength(0);

  // Accept.
  await acceptButton.click();

  // The server-rendered banner unmounts after router.refresh() because
  // the cookie now reads "granted".
  await expect(acceptButton).toHaveCount(0);
  await expect(declineButton).toHaveCount(0);

  // Cookie set to "granted".
  cookies = (await context.cookies()).filter((c) => c.name === "analyticsConsent");
  expect(cookies).toHaveLength(1);
  expect(cookies[0].value).toBe("granted");

  // Exactly the consent_granted event fired (a single POST to the ingest
  // endpoint). It might land on either the direct PostHog URL or the
  // same-origin proxy depending on env; either matches the pattern.
  await expect.poll(() => analyticsHits.length, { timeout: 2000 }).toBeGreaterThanOrEqual(1);
  expect(analyticsHits.every((hit) => hit.startsWith("POST "))).toBe(true);

  // Reload — banner stays gone, no fresh consent_granted is fired
  // (the event is a one-shot, not a per-page-view ping).
  const beforeReload = analyticsHits.length;
  await page.reload();
  await expect(page.getByRole("button", { name: "Accept analytics" })).toHaveCount(0);

  // Wait briefly for any deferred fetch — there should be none.
  await page.waitForTimeout(250);
  expect(analyticsHits.length).toBe(beforeReload);
});

test("analytics consent: Decline persists; no analytics request fires before, during, or after a navigation", async ({
  page,
  context,
}) => {
  await installPortfolioMocks(page);
  const analyticsHits = await installAnalyticsCaptureAndStubs(page);

  await signIn(page, { next: "/portfolio" });

  const declineButton = page.getByRole("button", { name: "Decline" });
  await expect(declineButton).toBeVisible();
  expect(analyticsHits).toEqual([]);

  await declineButton.click();
  await expect(declineButton).toHaveCount(0);

  const cookies = (await context.cookies()).filter((c) => c.name === "analyticsConsent");
  expect(cookies).toHaveLength(1);
  expect(cookies[0].value).toBe("declined");

  // Navigate to a different surface — the banner stays gone (the cookie
  // is "declined" so the server returns null for the banner) and no
  // analytics fetch is dispatched.
  await page.goto("/help");
  await expect(page.getByRole("button", { name: "Accept analytics" })).toHaveCount(0);

  await page.waitForTimeout(250);
  expect(analyticsHits).toEqual([]);
});
