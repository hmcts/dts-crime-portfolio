import type { FullConfig } from "@playwright/test";

import { startSanityFixtureServer, stopSanityFixtureServer } from "./fixtures/sanity-server";

/**
 * Spin up the Sanity fixture server before any test or webServer starts.
 * Tests configure per-test responses via HTTP POST to
 * `${SANITY_MOCK_PROXY}/__set-fixtures`. The Next.js webServer is told to
 * proxy *.api.sanity.io to this host via the preload script.
 */
export default async function globalSetup(_config: FullConfig): Promise<() => Promise<void>> {
  const port = Number(process.env.SANITY_MOCK_PORT ?? 3199);
  await startSanityFixtureServer(port);
  console.log(`[sanity-fixture-server] listening on http://127.0.0.1:${port}`);
  return async () => {
    await stopSanityFixtureServer();
  };
}
