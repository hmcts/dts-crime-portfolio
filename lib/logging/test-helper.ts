/**
 * Test helper for the structured logger.
 *
 * Tests that need to inspect emitted events should wrap the code under test
 * in `captureLogs(fn)`. The helper installs an in-memory sink for the
 * duration of `fn`, restores the previous sink afterwards (even if `fn`
 * throws), and returns the captured events alongside the function's
 * resolved value.
 *
 * Usage:
 *
 *   const { events, result } = await captureLogs(async () => {
 *     return doSomethingThatLogs();
 *   });
 *
 * Spec: openspec/specs/observability/spec.md.
 */

import { captureLogs as installCapture } from "./logger";
import type { LogEvent } from "./types";

export type { LogEvent } from "./types";

export interface CapturedLogs<T> {
  events: LogEvent[];
  result: T;
}

/**
 * Run `fn` with the logger sink redirected to an in-memory buffer. Returns
 * the parsed events and the function's return value. Restores the previous
 * sink even if `fn` throws (the error is re-thrown so callers can assert on
 * it).
 */
export async function captureLogs<T>(
  fn: () => T | Promise<T>,
): Promise<CapturedLogs<T>> {
  const capture = installCapture();
  try {
    const result = await fn();
    return { events: capture.events.slice(), result };
  } finally {
    capture.restore();
  }
}
