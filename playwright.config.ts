import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the dts-crime-portfolio end-to-end suite.
 *
 * Tests run against a production build (`next build && next start`) so the
 * app behaves the way Render serves it. Sanity is never contacted — a
 * local fixture server (`playwright/fixtures/sanity-server.ts`) impersonates
 * the Sanity API. The Next.js process is wired to it via:
 *   - a Node preload (`playwright/fixtures/preload-mock.cjs`) that rewrites
 *     `*.api.sanity.io` requests to the local server, AND
 *   - `SANITY_MOCK_PROXY` pointing at the fixture server.
 * Tests configure per-test fixtures via the server's `/__set-fixtures`
 * HTTP endpoint before each navigation. See
 * `playwright/fixtures/sanity-mock.ts` for the helper API.
 *
 * Workers default to 1 because the fixture server is shared in-process.
 *
 * The base URL uses `localhost` (not `127.0.0.1`) for two reasons:
 *  1. Chromium treats `localhost` as a secure context even over plain
 *     HTTP, so the `secure: true` previewAuth cookie is accepted in tests
 *     without standing up TLS.
 *  2. Next.js's `request.nextUrl.clone()` rewrites the redirect target
 *     to `localhost`; matching the test's origin avoids a host-mismatch
 *     loop on sign-in.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

const SANITY_MOCK_PORT = Number(process.env.SANITY_MOCK_PORT ?? 3199);
const SANITY_MOCK_URL = `http://127.0.0.1:${SANITY_MOCK_PORT}`;

// 64 zero bytes hex satisfies the 32-char minimum in lib/preview-auth/cookie.ts.
const PREVIEW_COOKIE_SECRET = "0".repeat(64);

const PRELOAD_PATH = require.resolve("./playwright/fixtures/preload-mock.cjs");

export default defineConfig({
  testDir: "./playwright/tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  globalSetup: require.resolve("./playwright/global-setup.ts"),
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    extraHTTPHeaders: {
      "x-sanity-mock-url": SANITY_MOCK_URL,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Use the locally-installed `next` binary directly so the spawn does
    // not depend on `pnpm` being on PATH (Playwright spawns webServer in a
    // bare `/bin/sh` whose PATH does not always include pnpm).
    command: `node_modules/.bin/next build && node_modules/.bin/next start --port ${PORT} --hostname localhost`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      APP_ENVIRONMENT: "preview",
      NEXT_PUBLIC_SANITY_PROJECT_ID: "test-project",
      NEXT_PUBLIC_SANITY_DATASET: "test",
      SANITY_API_TOKEN: "fake-token",
      PREVIEW_AUTH_COOKIE_SECRET: PREVIEW_COOKIE_SECRET,
      PORT: String(PORT),
      // Node preload that intercepts *.api.sanity.io traffic and routes it
      // to the local fixture server.
      NODE_OPTIONS: `--require ${JSON.stringify(PRELOAD_PATH)}`,
      SANITY_MOCK_PROXY: SANITY_MOCK_URL,
    },
  },
});
