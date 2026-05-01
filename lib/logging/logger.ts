/**
 * Singleton structured JSON logger.
 *
 * Emits one line of valid JSON per call to stdout via `process.stdout.write`.
 * Threshold is read from the `LOG_LEVEL` env var (`debug`/`info`/`warn`/
 * `error`); defaults to `info` so that `debug` is suppressed.
 *
 * In `NODE_ENV=test` the logger is silent by default. Tests may opt into
 * capturing emitted events via `captureLogs()`, which swaps the underlying
 * sink for an in-memory array.
 *
 * Spec: openspec/specs/observability/spec.md.
 */

import { AsyncLocalStorage } from "node:async_hooks";

import type { LogEvent, LogFields, LogLevel, RequestLogContext } from "./types";

const SERVICE = "dts-crime-portfolio";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * AsyncLocalStorage carrying per-request log context (requestId, userEmail,
 * method, path). Exported so the request wrapper can populate it; logger
 * methods read from it on every emit so any logger call inside a handler
 * automatically inherits the request fields.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestLogContext>();

type Sink = (line: string) => void;

/**
 * Production sink. Writes one line of valid JSON terminated by `\n`.
 *
 * In the Node.js runtime we use `process.stdout.write` to avoid the
 * `console.log` family entirely. In the Edge runtime, `process.stdout` is
 * not available; we fall back to `console.log`, which the Edge runtime
 * routes to stdout as a single line.
 */
const stdoutSink: Sink = (line) => {
  if (typeof process !== "undefined" && process.stdout?.write) {
    process.stdout.write(line + "\n");
    return;
  }
  // Edge runtime fallback. `console.log` appends its own newline.
  console.log(line);
};

const silentSink: Sink = () => {
  /* swallowed */
};

let activeSink: Sink = defaultSink();

function defaultSink(): Sink {
  return process.env.NODE_ENV === "test" ? silentSink : stdoutSink;
}

function resolveThreshold(): number {
  const raw = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return LEVEL_PRIORITY[raw];
  }
  return LEVEL_PRIORITY.info;
}

function emit(level: LogLevel, event: string, fields?: LogFields): void {
  if (LEVEL_PRIORITY[level] < resolveThreshold()) {
    return;
  }
  const context = requestContextStorage.getStore();
  const payload: LogEvent = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: SERVICE,
    ...(context ?? {}),
    ...(fields ?? {}),
  };
  let line: string;
  try {
    line = JSON.stringify(payload);
  } catch {
    // Best-effort fallback if a field has a non-serialisable value
    // (e.g. a circular reference). Keep the line valid JSON.
    line = JSON.stringify({
      timestamp: payload.timestamp,
      level,
      event,
      service: SERVICE,
      serializationError: true,
    });
  }
  activeSink(line);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => emit("debug", event, fields),
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

/**
 * Test helper. Swaps the logger sink for an in-memory array. Returns:
 *   - `lines`: the captured raw JSON lines (no trailing newline)
 *   - `events`: the parsed events
 *   - `restore`: restores the previous sink (call in `afterEach`)
 *
 * The capture overrides the test-default silence, so a test that opts in
 * via `captureLogs()` will receive any events the code under test emits.
 */
export function captureLogs(): {
  lines: string[];
  events: LogEvent[];
  restore: () => void;
} {
  const lines: string[] = [];
  const events: LogEvent[] = [];
  const previous = activeSink;
  activeSink = (line) => {
    lines.push(line);
    try {
      events.push(JSON.parse(line) as LogEvent);
    } catch {
      // captured line was not valid JSON — leave events untouched, the
      // raw line is still in `lines` for debugging.
    }
  };
  return {
    lines,
    events,
    restore: () => {
      activeSink = previous;
    },
  };
}

/**
 * Force the logger back to its environment default sink. Useful in test
 * teardown if a `captureLogs()` call was not paired with `restore()`.
 */
export function resetLoggerForTests(): void {
  activeSink = defaultSink();
}
