import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  captureLogs,
  logger,
  resetLoggerForTests,
} from "@/lib/logging/logger";

describe("logger module", () => {
  afterEach(() => {
    resetLoggerForTests();
    delete process.env.LOG_LEVEL;
  });

  describe("JSON shape", () => {
    it("emits a single JSON line containing every mandatory field", () => {
      const capture = captureLogs();
      logger.info("smoke_event", { foo: "bar" });
      capture.restore();

      expect(capture.lines).toHaveLength(1);
      const line = capture.lines[0];
      // Must be a single line (no embedded newlines) and parseable JSON.
      expect(line).not.toContain("\n");
      const parsed = JSON.parse(line);
      expect(parsed.timestamp).toEqual(expect.any(String));
      expect(() => new Date(parsed.timestamp).toISOString()).not.toThrow();
      expect(parsed.level).toBe("info");
      expect(parsed.event).toBe("smoke_event");
      expect(parsed.service).toBe("dts-crime-portfolio");
      expect(parsed.foo).toBe("bar");
    });

    it("preserves all four severity methods", () => {
      const capture = captureLogs();
      process.env.LOG_LEVEL = "debug";
      logger.debug("d");
      logger.info("i");
      logger.warn("w");
      logger.error("e");
      capture.restore();

      expect(capture.events.map((e) => e.level)).toEqual([
        "debug",
        "info",
        "warn",
        "error",
      ]);
    });

    it("survives non-serialisable fields without throwing", () => {
      const capture = captureLogs();
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      expect(() => logger.info("bad", { cyclic })).not.toThrow();
      capture.restore();
      expect(capture.lines).toHaveLength(1);
      const parsed = JSON.parse(capture.lines[0]);
      expect(parsed.event).toBe("bad");
      expect(parsed.serializationError).toBe(true);
    });
  });

  describe("level threshold", () => {
    it("suppresses debug when LOG_LEVEL is unset (default info)", () => {
      delete process.env.LOG_LEVEL;
      const capture = captureLogs();
      logger.debug("hidden");
      logger.info("visible");
      capture.restore();
      const events = capture.events.map((e) => e.event);
      expect(events).toEqual(["visible"]);
    });

    it("emits debug when LOG_LEVEL=debug", () => {
      process.env.LOG_LEVEL = "debug";
      const capture = captureLogs();
      logger.debug("now-visible");
      capture.restore();
      expect(capture.events.map((e) => e.event)).toEqual(["now-visible"]);
    });

    it("suppresses info when LOG_LEVEL=warn", () => {
      process.env.LOG_LEVEL = "warn";
      const capture = captureLogs();
      logger.info("hidden");
      logger.warn("visible");
      capture.restore();
      expect(capture.events.map((e) => e.event)).toEqual(["visible"]);
    });

    it("falls back to info when LOG_LEVEL is invalid", () => {
      process.env.LOG_LEVEL = "verbose";
      const capture = captureLogs();
      logger.debug("hidden");
      logger.info("visible");
      capture.restore();
      expect(capture.events.map((e) => e.event)).toEqual(["visible"]);
    });
  });

  describe("test silence", () => {
    it("does not write anything to stdout when NODE_ENV=test (default sink)", () => {
      // Sanity: vitest sets NODE_ENV=test, so the default sink is silent.
      expect(process.env.NODE_ENV).toBe("test");
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      try {
        logger.info("would_be_visible_in_prod");
        logger.error("also_silenced");
      } finally {
        writeSpy.mockRestore();
      }
      expect(writeSpy).not.toHaveBeenCalled();
    });
  });

  describe("captureLogs helper", () => {
    let capture: ReturnType<typeof captureLogs>;

    beforeEach(() => {
      capture = captureLogs();
    });

    afterEach(() => {
      capture.restore();
    });

    it("collects emitted events as parsed objects and raw lines", () => {
      logger.info("a", { x: 1 });
      logger.warn("b");
      expect(capture.lines).toHaveLength(2);
      expect(capture.events).toHaveLength(2);
      expect(capture.events[0].event).toBe("a");
      expect(capture.events[0].x).toBe(1);
      expect(capture.events[1].level).toBe("warn");
    });

    it("stops collecting after restore() is called", () => {
      logger.info("first");
      capture.restore();
      logger.info("second");
      // Re-capture is fine, the `second` event should NOT appear in the
      // already-restored capture.
      expect(capture.events.map((e) => e.event)).toEqual(["first"]);
    });
  });
});
