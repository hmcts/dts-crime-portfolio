/**
 * Per-request logging wrapper for Next.js Route Handlers.
 *
 * Wraps a handler so that:
 *   - on entry, a `request_start` event is logged with `{ requestId, method,
 *     path }`
 *   - on a clean return, a `request_end` event is logged with `status` and
 *     `durationMs`
 *   - if the handler throws, a `request_error` event is logged at error
 *     level with `message` and `stack`, then a `request_end` is logged with
 *     status 500, and the original error is re-thrown so the existing Next.js
 *     error envelope remains unchanged
 *
 * A request-scoped `AsyncLocalStorage` carries `{ requestId, userEmail,
 * method, path }`, so any `logger.*` call made inside the handler picks up
 * those fields without explicit threading.
 *
 * If the upstream middleware has set an `x-request-id` request header, the
 * wrapper reuses that value so a single request shares one id across the
 * `request_received` (middleware) and `request_start`/`request_end` (handler)
 * events. Otherwise it mints a fresh UUID v4.
 *
 * Spec: openspec/specs/observability/spec.md.
 */

import { logger, requestContextStorage } from "./logger";
import type { RequestLogContext } from "./types";

type RouteHandler<Args extends unknown[]> = (
  request: Request,
  ...rest: Args
) => Response | Promise<Response>;

const REQUEST_ID_HEADER = "x-request-id";

function safePath(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}

function readForwardedRequestId(request: Request): string | undefined {
  try {
    const forwarded = request.headers.get(REQUEST_ID_HEADER);
    if (forwarded && forwarded.trim().length > 0) return forwarded;
  } catch {
    // Headers access can fail in synthetic test environments — fall through
    // and the wrapper will mint a fresh id.
  }
  return undefined;
}

async function bestEffortUserEmail(): Promise<string | undefined> {
  // Best-effort: if the resolver throws (e.g. headers() outside a request
  // scope, env mis-set), do not break the request — return undefined and let
  // the handler's own resolveUser() call report the error.
  try {
    const { resolveUser } = await import("@/lib/auth/resolver");
    const user = await resolveUser();
    if (user.kind === "authorized") return user.email;
    return undefined;
  } catch {
    return undefined;
  }
}

export function withRequestLogging<Args extends unknown[]>(
  handler: RouteHandler<Args>,
): (request: Request, ...rest: Args) => Promise<Response> {
  return async function wrappedHandler(
    request: Request,
    ...rest: Args
  ): Promise<Response> {
    const requestId = readForwardedRequestId(request) ?? crypto.randomUUID();
    const method = request.method;
    const path = safePath(request);

    const userEmail = await bestEffortUserEmail();

    const context: RequestLogContext = {
      requestId,
      method,
      path,
      ...(userEmail ? { userEmail } : {}),
    };

    return requestContextStorage.run(context, async () => {
      const start = Date.now();
      logger.info("request_start", { requestId, method, path });

      try {
        const response = await handler(request, ...rest);
        logger.info("request_end", {
          requestId,
          method,
          path,
          status: response.status,
          durationMs: Date.now() - start,
        });
        return response;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : String(cause);
        const stack = cause instanceof Error ? cause.stack : undefined;
        logger.error("request_error", {
          requestId,
          method,
          path,
          message,
          stack,
        });
        logger.info("request_end", {
          requestId,
          method,
          path,
          status: 500,
          durationMs: Date.now() - start,
        });
        throw cause;
      }
    });
  };
}
