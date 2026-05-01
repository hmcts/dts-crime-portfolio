import { afterEach, describe, expect, it } from "vitest";

import {
  captureLogs,
  logger,
  resetLoggerForTests,
} from "@/lib/logging/logger";
import {
  getRequestContext,
  withRequestContext,
} from "@/lib/logging/requestContext";

describe("request-scoped logging context", () => {
  afterEach(() => {
    resetLoggerForTests();
  });

  it("populates the store for the duration of the callback", () => {
    expect(getRequestContext()).toBeUndefined();

    const observed = withRequestContext(
      { requestId: "req-1", method: "GET", path: "/api/x" },
      () => getRequestContext(),
    );

    expect(observed).toEqual({
      requestId: "req-1",
      method: "GET",
      path: "/api/x",
    });

    expect(getRequestContext()).toBeUndefined();
  });

  it("merges request fields into every logger call inside the scope", () => {
    const capture = captureLogs();
    withRequestContext(
      {
        requestId: "req-2",
        method: "POST",
        path: "/api/y",
        userEmail: "alice@hmcts.net",
      },
      () => {
        logger.info("inside_event", { extra: 1 });
      },
    );
    capture.restore();

    expect(capture.events).toHaveLength(1);
    const evt = capture.events[0];
    expect(evt.requestId).toBe("req-2");
    expect(evt.method).toBe("POST");
    expect(evt.path).toBe("/api/y");
    expect(evt.userEmail).toBe("alice@hmcts.net");
    expect(evt.extra).toBe(1);
  });

  it("propagates across awaited async work inside the scope", async () => {
    const capture = captureLogs();
    await withRequestContext(
      { requestId: "req-async", method: "GET", path: "/api/async" },
      async () => {
        await Promise.resolve();
        await new Promise<void>((resolve) => setImmediate(resolve));
        logger.info("after_await");
      },
    );
    capture.restore();

    expect(capture.events).toHaveLength(1);
    expect(capture.events[0].requestId).toBe("req-async");
    expect(capture.events[0].path).toBe("/api/async");
  });

  it("does not leak fields between sibling scopes", async () => {
    const capture = captureLogs();
    await Promise.all([
      withRequestContext(
        { requestId: "req-A", method: "GET", path: "/a" },
        async () => {
          await Promise.resolve();
          logger.info("from_a");
        },
      ),
      withRequestContext(
        { requestId: "req-B", method: "POST", path: "/b" },
        async () => {
          await Promise.resolve();
          logger.info("from_b");
        },
      ),
    ]);
    capture.restore();

    const a = capture.events.find((e) => e.event === "from_a");
    const b = capture.events.find((e) => e.event === "from_b");
    expect(a?.requestId).toBe("req-A");
    expect(a?.path).toBe("/a");
    expect(b?.requestId).toBe("req-B");
    expect(b?.path).toBe("/b");
  });

  it("nested scopes fully replace the outer scope for the inner callback", () => {
    const capture = captureLogs();
    withRequestContext(
      { requestId: "outer", method: "GET", path: "/outer" },
      () => {
        logger.info("from_outer");
        withRequestContext(
          { requestId: "inner", method: "POST", path: "/inner" },
          () => {
            logger.info("from_inner");
          },
        );
        // After the inner scope ends, the outer scope is back in effect.
        logger.info("from_outer_again");
      },
    );
    capture.restore();

    const map = Object.fromEntries(
      capture.events.map((e) => [e.event, e.requestId]),
    );
    expect(map.from_outer).toBe("outer");
    expect(map.from_inner).toBe("inner");
    expect(map.from_outer_again).toBe("outer");
  });

  it("logger calls outside any scope still emit (without request fields)", () => {
    const capture = captureLogs();
    logger.info("standalone");
    capture.restore();

    expect(capture.events).toHaveLength(1);
    const evt = capture.events[0];
    expect(evt.event).toBe("standalone");
    expect(evt.requestId).toBeUndefined();
    expect(evt.method).toBeUndefined();
    expect(evt.path).toBeUndefined();
  });
});
