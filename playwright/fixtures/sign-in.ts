import { type Page } from "@playwright/test";

import {
  installBaselineSanityMocks,
  type SanityResponseMap,
} from "./sanity-mock";

/**
 * Sign in via the preview-auth form. The Server Action issues a Sanity
 * mutation to record the previewSession; the mock layer must already be
 * installed before this helper is called or the audit write will hang
 * waiting for the real Sanity API.
 *
 * `next` defaults to `/portfolio` so the helper can pre-warm the surface
 * the test wants to exercise.
 */
export async function signIn(
  page: Page,
  options: {
    email?: string;
    next?: string;
  } = {},
): Promise<void> {
  const email = options.email ?? "tester@hmcts.net";
  const next = options.next ?? "/portfolio";

  await page.goto(`/preview-auth?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();

  // Server Action redirects to `next` on success. We wait on the URL
  // because the layout banner contains "Preview environment" both before
  // and after sign-in, which would make a text-based wait ambiguous.
  await page.waitForURL((url) => {
    return url.pathname === next || url.pathname.startsWith(`${next}/`);
  });
}

/**
 * Re-export so tests can install baseline Sanity mocks before signing in.
 * Implementation lives in `sanity-mock.ts`.
 */
export async function installBaselineMocks(
  page: Page,
  extra: SanityResponseMap = [],
): Promise<void> {
  await installBaselineSanityMocks(page, extra);
}
