import { beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

vi.mock("server-only", () => ({}));

const headersMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ headers: () => Promise.resolve(headersMock) }));

/**
 * Smoke test for the access-control auth contract.
 *
 * Spec: openspec/specs/access-control/spec.md (Smoke test asserts gating).
 *
 * This file enforces two complementary guarantees so that no future API
 * route can silently bypass the `resolveUser()` gate:
 *
 * 1. STATIC SCAN — every `route.ts(x)` under `app/api/` imports the resolver
 *    from `@/lib/auth/resolver` and references the `resolveUser` identifier.
 *    Catches the case where someone adds a new route and forgets the
 *    contract entirely.
 *
 * 2. BEHAVIOURAL — for each existing API route handler, calling it with a
 *    request that has no `x-user-email` header returns HTTP 401. Catches
 *    the case where someone imports `resolveUser` for show but forgets to
 *    short-circuit on `kind === "unauthorized"`.
 */

// Resolve the repo root from this test file's location so the static scan
// works regardless of cwd. tests/ lives directly under the repo root.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API_ROOT = join(REPO_ROOT, "app", "api");

/**
 * Allowlist of route files (paths relative to the repo root) that
 * legitimately do NOT call `resolveUser`. Empty by design — every existing
 * API route is gated. If you need to exempt a future route (e.g. a public
 * health check), add it here with a comment explaining why, and propose a
 * spec change first.
 */
const STATIC_SCAN_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // The analytics ingest proxy is consent-gated (analyticsConsent cookie),
  // not auth-gated. Per openspec/specs/analytics/spec.md: the proxy 204s
  // when the cookie is missing and never reaches `resolveUser()`.
  "app/api/analytics/ingest/route.ts",
]);

function findRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findRouteFiles(full));
    } else if (entry.name === "route.ts" || entry.name === "route.tsx") {
      out.push(full);
    }
  }
  return out;
}

describe("Static scan: every API route imports the auth resolver", () => {
  const routeFiles = findRouteFiles(API_ROOT);

  it("finds at least one API route under app/api", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  for (const file of routeFiles) {
    const rel = relative(REPO_ROOT, file);
    if (STATIC_SCAN_ALLOWLIST.has(rel)) continue;

    it(`${rel} imports resolveUser from @/lib/auth/resolver`, () => {
      const source = readFileSync(file, "utf-8");
      expect(source).toMatch(/from\s+["']@\/lib\/auth\/resolver["']/);
      expect(source).toMatch(/\bresolveUser\b/);
    });
  }
});

describe("Behavioural: each API route returns 401 when x-user-email is missing", () => {
  beforeEach(() => {
    headersMock.get.mockReset();
    headersMock.get.mockReturnValue(null);
  });

  it("GET /api/portfolios/reference-data returns 401", async () => {
    const { GET } = await import("@/app/api/portfolios/reference-data/route");
    const response = await GET(
      new Request("http://example.com/api/portfolios/reference-data"),
    );
    expect(response.status).toBe(401);
  });

  it("GET /api/portfolios/capabilities returns 401", async () => {
    const { GET } = await import("@/app/api/portfolios/capabilities/route");
    const response = await GET(new Request("http://example.com/api/portfolios/capabilities"));
    expect(response.status).toBe(401);
  });
});
