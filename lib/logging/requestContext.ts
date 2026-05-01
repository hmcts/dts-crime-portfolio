/**
 * Request-scoped logging context.
 *
 * Wraps `node:async_hooks` AsyncLocalStorage so that any logger call inside
 * a route handler automatically inherits `requestId`, `method`, `path`, and
 * (when known) `userEmail` without explicit threading.
 *
 * The actual `AsyncLocalStorage` instance lives on the logger module (so
 * the logger can read from it on every emit). This module re-exports the
 * helpers route handlers use.
 *
 * Spec: openspec/specs/observability/spec.md.
 */

import { requestContextStorage } from "./logger";
import type { RequestLogContext } from "./types";

export type { RequestLogContext } from "./types";

/**
 * Run `fn` with `ctx` populated as the active request-scope. Logger calls
 * made (synchronously or asynchronously) within `fn` will inherit the ctx
 * fields. Nested calls fully replace the outer scope for the inner fn —
 * behaviour identical to AsyncLocalStorage.run.
 */
export function withRequestContext<T>(
  ctx: RequestLogContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return requestContextStorage.run(ctx, fn);
}

/**
 * Read the current request-scope, if any. Returns `undefined` outside of a
 * `withRequestContext` callback. Mostly useful for tests; production code
 * generally does not need to read the store directly because the logger
 * does so on every emit.
 */
export function getRequestContext(): RequestLogContext | undefined {
  return requestContextStorage.getStore();
}
