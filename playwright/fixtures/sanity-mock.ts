import { request as makeAPIRequest, type Page } from "@playwright/test";

import { emptyReferenceData } from "./project-fixtures";

/**
 * Sanity-fixture configuration helpers used by every spec. The actual
 * mock server lives in `sanity-server.ts` and is started once per run by
 * `global-setup.ts`. Tests POST their per-test fixture map to
 * `${SANITY_MOCK_PROXY}/__set-fixtures` before navigating, and the Next.js
 * process picks up those responses via the Node preload that rewrites
 * `*.api.sanity.io` requests to the local server.
 *
 * Fragments are matched in declaration order — put the most specific
 * matchers first.
 */
export type SanityResponseMap = Array<{
  fragment: string;
  result: unknown;
  /**
   * Optional: only match when every key in `paramsEqual` exactly equals
   * the corresponding GROQ parameter on the request. Useful when two
   * queries share a fragment but differ in parameter binding (e.g.
   * "list all projects" vs "list pilot projects").
   */
  paramsEqual?: Record<string, unknown>;
}>;

export interface InstallSanityMocksOptions {
  /** Fallback for any unmatched query. Defaults to `null`. */
  fallback?: unknown;
  /** Mutation responder. Defaults to `{ transactionId: "fake" }`. */
  mutationResult?: unknown;
}

const SANITY_MOCK_PORT = Number(process.env.SANITY_MOCK_PORT ?? 3199);
const SANITY_MOCK_URL = `http://127.0.0.1:${SANITY_MOCK_PORT}`;

/**
 * Replace the fixture server's response map with the supplied entries.
 * The previous test's fixtures (if any) are cleared.
 */
export async function installSanityMocks(
  _page: Page,
  responses: SanityResponseMap,
  options: InstallSanityMocksOptions = {},
): Promise<void> {
  const apiContext = await makeAPIRequest.newContext();
  try {
    const response = await apiContext.post(`${SANITY_MOCK_URL}/__set-fixtures`, {
      data: {
        fixtures: responses,
        fallback: options.fallback ?? null,
        mutationResult: options.mutationResult ?? { transactionId: "fake" },
      },
    });
    if (!response.ok()) {
      throw new Error(
        `[sanity-mock] failed to set fixtures: ${response.status()} ${await response.text()}`,
      );
    }
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Convenience wrapper for surfaces that don't customise reference-data —
 * installs harmless empty arrays for every dropdown source plus the
 * `previewSession` audit lookup, then merges the caller's overrides on top.
 *
 * Caller-supplied fragments are checked before the empty defaults so a
 * test can override (e.g.) the project list while still benefitting from
 * the boilerplate.
 */
export async function installBaselineSanityMocks(
  page: Page,
  extra: SanityResponseMap = [],
  options: InstallSanityMocksOptions = {},
): Promise<void> {
  await installSanityMocks(
    page,
    [
      ...extra,
      { fragment: '_type == "previewSession"', result: null },
      { fragment: '_type == "group"', result: emptyReferenceData.groups },
      { fragment: '_type == "directorate"', result: emptyReferenceData.directorates },
      { fragment: '_type == "businessArea"', result: emptyReferenceData.businessAreas },
      { fragment: '_type == "person"', result: emptyReferenceData.people },
      { fragment: '_type == "capability"', result: emptyReferenceData.capabilities },
      { fragment: '_type == "action"', result: emptyReferenceData.actions },
      // FAQ list — defaults to empty so navigations to /help during
      // tests that don't seed FAQs don't fall through to the real Sanity.
      { fragment: '_type == "faq"', result: [] },
    ],
    options,
  );
}
