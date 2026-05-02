import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  captureLogs,
  logger,
  resetLoggerForTests,
} from "@/lib/logging/logger";
import { withRequestLogging } from "@/lib/logging/withLogging";

vi.mock("server-only", () => ({}));

const resolveUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/resolver", () => ({
  resolveUser: resolveUserMock,
}));

describe("withRequestLogging", () => {
  beforeEach(() => {
    resolveUserMock.mockReset();
    resolveUserMock.mockResolvedValue({ kind: "unauthorized", reason: "missing-header" });
  });

  afterEach(() => {
    resetLoggerForTests();
  });

  function makeRequest(method = "GET", path = "/api/test"): Request {
    return new Request(`http://example.com${path}`, { method });
  }

  it("logs request_start and request_end on a successful response", async () => {
    const capture = captureLogs();
    const wrapped = withRequestLogging(async () =>
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );

    const response = await wrapped(makeRequest("GET", "/api/foo"));
    capture.restore();

    expect(response.status).toBe(200);

    const events = capture.events;
    expect(events.map((e) => e.event)).toEqual(["request_start", "request_end"]);
    const start = events[0];
    const end = events[1];

    expect(start.level).toBe("info");
    expect(start.method).toBe("GET");
    expect(start.path).toBe("/api/foo");
    expect(typeof start.requestId).toBe("string");
    // RFC 4122 UUID v4 shape
    expect(start.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    expect(end.event).toBe("request_end");
    expect(end.status).toBe(200);
    expect(typeof end.durationMs).toBe("number");
    expect(end.durationMs).toBeGreaterThanOrEqual(0);
    expect(end.requestId).toBe(start.requestId);
  });

  it("propagates the requestId to logger calls inside the handler", async () => {
    const capture = captureLogs();
    const wrapped = withRequestLogging(async () => {
      logger.info("inner_event", { hello: "world" });
      return new Response(null, { status: 204 });
    });

    await wrapped(makeRequest());
    capture.restore();

    const inner = capture.events.find((e) => e.event === "inner_event");
    expect(inner).toBeDefined();
    const start = capture.events.find((e) => e.event === "request_start")!;
    expect(inner!.requestId).toBe(start.requestId);
    expect(inner!.method).toBe("GET");
    expect(inner!.path).toBe("/api/test");
    expect(inner!.hello).toBe("world");
  });

  it("logs request_error and a request_end with status 500 when the handler throws, then rethrows", async () => {
    const capture = captureLogs();
    const boom = new Error("kaboom");
    const wrapped = withRequestLogging(async () => {
      throw boom;
    });

    await expect(wrapped(makeRequest("POST", "/api/break"))).rejects.toBe(boom);
    capture.restore();

    const events = capture.events.map((e) => e.event);
    expect(events).toEqual(["request_start", "request_error", "request_end"]);

    const errorEvent = capture.events[1];
    expect(errorEvent.level).toBe("error");
    expect(errorEvent.message).toBe("kaboom");
    expect(typeof errorEvent.stack).toBe("string");

    const endEvent = capture.events[2];
    expect(endEvent.status).toBe(500);
    expect(typeof endEvent.durationMs).toBe("number");
  });

  it("attaches userEmail from the resolver when the user is authorized", async () => {
    resolveUserMock.mockResolvedValueOnce({
      kind: "authorized",
      email: "alice@hmcts.net",
      isAdmin: false,
      editableProjects: [],
    });

    const capture = captureLogs();
    const wrapped = withRequestLogging(async () => {
      logger.info("inner");
      return new Response(null, { status: 200 });
    });
    await wrapped(makeRequest());
    capture.restore();

    for (const ev of capture.events) {
      expect(ev.userEmail).toBe("alice@hmcts.net");
    }
  });

  it("omits userEmail when the resolver returns unauthorized", async () => {
    resolveUserMock.mockResolvedValueOnce({ kind: "unauthorized", reason: "missing-header" });

    const capture = captureLogs();
    const wrapped = withRequestLogging(async () => new Response(null, { status: 401 }));
    await wrapped(makeRequest());
    capture.restore();

    for (const ev of capture.events) {
      expect(ev.userEmail).toBeUndefined();
    }
  });

  it("does not break the request when the resolver itself throws", async () => {
    resolveUserMock.mockRejectedValueOnce(new Error("resolver exploded"));

    const capture = captureLogs();
    const wrapped = withRequestLogging(async () => new Response(null, { status: 200 }));
    const response = await wrapped(makeRequest());
    capture.restore();

    expect(response.status).toBe(200);
    // Lifecycle events still emitted, just without userEmail.
    expect(capture.events.map((e) => e.event)).toEqual([
      "request_start",
      "request_end",
    ]);
    for (const ev of capture.events) {
      expect(ev.userEmail).toBeUndefined();
    }
  });

  it("reuses a forwarded x-request-id header instead of minting a new id", async () => {
    const capture = captureLogs();
    const forwardedId = "11111111-2222-4333-8444-555555555555";
    const wrapped = withRequestLogging(async () => new Response(null, { status: 200 }));

    const request = new Request("http://example.com/api/forward", {
      method: "GET",
      headers: { "x-request-id": forwardedId },
    });
    await wrapped(request);
    capture.restore();

    for (const evt of capture.events) {
      expect(evt.requestId).toBe(forwardedId);
    }
  });

  it("forwards extra route-context arguments to the wrapped handler", async () => {
    const capture = captureLogs();
    const handler = vi.fn(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params;
      return new Response(JSON.stringify({ id }), { status: 200 });
    });
    const wrapped = withRequestLogging(handler);

    const ctx = { params: Promise.resolve({ id: "abc" }) };
    const response = await wrapped(makeRequest("GET", "/api/x/abc"), ctx);
    capture.restore();

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1]).toBe(ctx);
  });
});
