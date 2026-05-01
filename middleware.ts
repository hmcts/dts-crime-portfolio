import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_NAME, verifyCookieValue } from "@/lib/preview-auth/cookie";
import { isPreviewEnvironment } from "@/lib/preview-auth/environment";

const SIGN_IN_PATH = "/preview-auth";

/**
 * preview-auth middleware. Active when APP_ENVIRONMENT is `preview` or
 * `local`; in production it falls through and the upstream auth proxy is
 * the sole identity source.
 *
 * Spec: openspec/specs/preview-auth/spec.md.
 */
export async function middleware(request: NextRequest) {
  if (!isPreviewEnvironment()) {
    return NextResponse.next();
  }

  // Always strip any client-supplied x-user-email — the only legitimate
  // value comes from the signed cookie below.
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete("x-user-email");

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === SIGN_IN_PATH || path.startsWith(`${SIGN_IN_PATH}/`);
  if (isAuthRoute) {
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return redirectToSignIn(request);
  }

  const result = await verifyCookieValue(cookie);
  if (!result.ok) {
    const response = redirectToSignIn(request);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  forwardedHeaders.set("x-user-email", result.email);
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
