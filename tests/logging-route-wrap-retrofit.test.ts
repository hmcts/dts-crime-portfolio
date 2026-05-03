import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureLogs, resetLoggerForTests } from "@/lib/logging/logger";

/**
 * Smoke tests proving the structured-logging wrapper landed on the routes
 * retrofitted in this PR. Each test verifies that calling the wrapped
 * handler emits a `request_start` followed by a `request_end`, with both
 * events sharing a single `requestId` and the spec's mandatory fields
 * (`timestamp`, `level`, `event`, `service`).
 *
 * Spec: openspec/specs/observability/spec.md
 *   - "API route lifecycle logging"
 *   - "Mandatory event fields"
 *   - "Request-scoped fields"
 *
 * The point of this file is parity, not behavioural coverage: the routes'
 * own behaviour is exercised in their respective test files (e.g.
 * `prompts-routes.test.ts`, `compare-route.test.ts`, etc.). Here we only
 * assert that the lifecycle events are emitted and carry the right shape.
 */

vi.mock("server-only", () => ({}));

const resolveUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/resolver", () => ({
  resolveUser: resolveUserMock,
}));

interface FakeTransaction {
  patch: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
}
interface FakeClient {
  fetch: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
}

const sanityClientMock = vi.hoisted((): {
  client: FakeClient;
  transaction: FakeTransaction;
} => {
  const transaction: FakeTransaction = {
    patch: vi.fn(function (this: FakeTransaction) {
      return this;
    }),
    create: vi.fn(function (this: FakeTransaction) {
      return this;
    }),
    commit: vi.fn(async () => ({ documentIds: ["chg-1"] })),
  };
  const client: FakeClient = {
    fetch: vi.fn(),
    transaction: vi.fn(() => transaction),
  };
  return { client, transaction };
});
vi.mock("@/lib/sanity/client", () => ({
  getSanityClient: () => sanityClientMock.client,
}));

// Prompts now live in Postgres; the lifecycle smoke test doesn't need a
// real DB. Stub `getDb` to a no-op chain that returns empty arrays —
// every route then exits via its own 404 path while the wrapper still
// emits the request_start / request_end pair we're asserting.
vi.mock("@/lib/db/client", () => {
  const empty = async () => [] as never[];
  const builder: Record<string, unknown> = {};
  const chain = (returnValue: unknown = []): Record<string, unknown> => {
    const obj: Record<string, unknown> = {};
    const methods = ["select", "from", "where", "limit", "orderBy", "values"];
    for (const m of methods) {
      obj[m] = () => obj;
    }
    obj.then = (resolve: (v: unknown) => unknown) => Promise.resolve(returnValue).then(resolve);
    return obj;
  };
  builder.select = () => chain([]);
  builder.insert = () => ({ values: () => Promise.resolve() });
  builder.delete = () => ({ where: () => Promise.resolve() });
  void empty;
  return {
    getDb: () => builder,
    closeDb: async () => {},
  };
});

const REQUIRED_FIELDS = ["timestamp", "level", "event", "service"] as const;

function expectLifecycleEvents(events: ReturnType<typeof captureLogs>["events"]) {
  const lifecycle = events.filter(
    (e) => e.event === "request_start" || e.event === "request_end",
  );
  expect(lifecycle.map((e) => e.event)).toEqual(["request_start", "request_end"]);
  for (const event of lifecycle) {
    for (const field of REQUIRED_FIELDS) {
      expect(event[field]).toBeTruthy();
    }
    expect(event.service).toBe("dts-crime-portfolio");
    expect(typeof event.requestId).toBe("string");
    expect(event.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  }
  expect(lifecycle[0].requestId).toBe(lifecycle[1].requestId);
  expect(lifecycle[1].status).toBeDefined();
  expect(typeof lifecycle[1].durationMs).toBe("number");
}

describe("logger retrofit on Wave-1 routes", () => {
  beforeEach(() => {
    resolveUserMock.mockReset();
    resolveUserMock.mockResolvedValue({
      kind: "unauthorized",
      reason: "missing-header",
    });
    sanityClientMock.client.fetch.mockReset();
    sanityClientMock.client.transaction.mockClear();
    sanityClientMock.transaction.patch.mockClear();
    sanityClientMock.transaction.create.mockClear();
    sanityClientMock.transaction.commit.mockClear();
  });

  afterEach(() => {
    resetLoggerForTests();
  });

  it("POST /api/prompts emits request_start and request_end via the wrapper", async () => {
    const capture = captureLogs();
    const { POST } = await import("@/app/api/prompts/route");
    const response = await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    capture.restore();

    expect(response.status).toBe(401);
    expectLifecycleEvents(capture.events);
    const start = capture.events.find((e) => e.event === "request_start")!;
    expect(start.method).toBe("POST");
    expect(start.path).toBe("/api/prompts");
  });

  it("POST /api/portfolios/submit emits request lifecycle events", async () => {
    const capture = captureLogs();
    const { POST } = await import("@/app/api/portfolios/submit/route");
    const response = await POST(
      new Request("http://localhost/api/portfolios/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    capture.restore();

    expect(response.status).toBe(401);
    expectLifecycleEvents(capture.events);
  });

  it("GET /api/portfolios/compare emits request lifecycle events", async () => {
    const capture = captureLogs();
    const { GET } = await import("@/app/api/portfolios/compare/route");
    const response = await GET(
      new Request("http://localhost/api/portfolios/compare?from=2026-01-01&to=2026-02-01", {
        method: "GET",
      }),
    );
    capture.restore();

    expect(response.status).toBe(401);
    expectLifecycleEvents(capture.events);
    const start = capture.events.find((e) => e.event === "request_start")!;
    expect(start.method).toBe("GET");
    expect(start.path).toBe("/api/portfolios/compare");
  });

  it("PATCH /api/portfolios/[id] emits request lifecycle events", async () => {
    const capture = captureLogs();
    const { PATCH } = await import("@/app/api/portfolios/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/portfolios/p-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      }),
      { params: Promise.resolve({ id: "p-1" }) },
    );
    capture.restore();

    expect(response.status).toBe(401);
    expectLifecycleEvents(capture.events);
  });

  it("attaches the resolver email to lifecycle events when authorized", async () => {
    resolveUserMock.mockResolvedValue({
      kind: "authorized",
      email: "alice@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    const capture = captureLogs();
    const { POST } = await import("@/app/api/prompts/[id]/upvote/route");
    // No mock for the prompt fetch -> the route returns 404, but lifecycle
    // events still fire and should carry the resolved email.
    sanityClientMock.client.fetch.mockResolvedValueOnce(null);
    await POST(
      new Request("http://localhost/api/prompts/p-1/upvote", { method: "POST" }),
      { params: Promise.resolve({ id: "p-1" }) },
    );
    capture.restore();

    const lifecycle = capture.events.filter(
      (e) => e.event === "request_start" || e.event === "request_end",
    );
    expect(lifecycle.length).toBe(2);
    for (const event of lifecycle) {
      expect(event.userEmail).toBe("alice@hmcts.net");
    }
  });
});
