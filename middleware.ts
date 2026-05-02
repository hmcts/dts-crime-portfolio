import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logging/logger";
import { COOKIE_NAME, verifyCookieValue } from "@/lib/preview-auth/cookie";
import { isPreviewEnvironment } from "@/lib/preview-auth/environment";

const SIGN_IN_PATH = "/preview-auth";
const REQUEST_ID_HEADER = "x-request-id";

/**
 * Edge-runtime middleware.
 *
 * Two concerns:
 *
 * 1. Observability: every request gets a UUID v4 `requestId`, forwarded to
 *    route handlers via the `x-request-id` request header. A
 *    `request_received` event is logged for every request that does not
 *    redirect. Edge runtime cannot use `node:async_hooks`, so the route
 *    handler (Node runtime) is responsible for opening its own
 *    AsyncLocalStorage scope keyed off the forwarded header.
 *
 * 2. preview-auth: when `APP_ENVIRONMENT` is `preview` or `local`, this
 *    middleware verifies the signed `previewAuth` cookie and rewrites the
 *    `x-user-email` header. Inert in production. The signed cookie value
 *    SHALL NEVER be logged.
 *
 * Spec: openspec/specs/observability/spec.md,
 * openspec/specs/preview-auth/spec.md.
 */
export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const path = request.nextUrl.pathname;
  const method = request.method;

  if (!isPreviewEnvironment()) {
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set(REQUEST_ID_HEADER, requestId);
    logger.info("request_received", { requestId, method, path });
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  // Always strip any client-supplied x-user-email — the only legitimate
  // value comes from the signed cookie below.
  const forwardedHeaders = new Headers(request.headers);
  const hadInboundHeader = forwardedHeaders.has("x-user-email");
  forwardedHeaders.delete("x-user-email");
  forwardedHeaders.set(REQUEST_ID_HEADER, requestId);

  if (hadInboundHeader) {
    logger.info("preview_auth_header_strip", {
      event_kind: "middleware_run",
      requestId,
      path,
      method,
    });
  }

  const isAuthRoute = path === SIGN_IN_PATH || path.startsWith(`${SIGN_IN_PATH}/`);
  if (isAuthRoute) {
    logger.info("request_received", { requestId, method, path });
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    logger.info("preview_auth_redirect", {
      event_kind: "middleware_run",
      requestId,
      path,
      method,
      reason: "no-cookie",
    });
    return redirectToSignIn(request);
  }

  const result = await verifyCookieValue(cookie);
  if (!result.ok) {
    logger.warn("preview_auth_cookie_invalid", {
      event_kind: "middleware_run",
      requestId,
      path,
      method,
      reason: result.reason,
    });
    const response = redirectToSignIn(request);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  forwardedHeaders.set("x-user-email", result.email);
  logger.info("request_received", {
    requestId,
    method,
    path,
    userEmail: result.email,
  });
  return NextResponse.next({ request: { headers: forwardedHeaders } });
}

function redirectToSignIn(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = SIGN_IN_PATH;
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match every request except Next.js internal assets and the favicon.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
