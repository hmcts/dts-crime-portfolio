import { NextResponse } from "next/server";

import {
  CONSENT_COOKIE_NAME,
  readConsentFromCookieHeader,
} from "@/lib/analytics/consent";
import { withRequestLogging } from "@/lib/logging/withLogging";

/**
 * Same-origin analytics ingest proxy.
 *
 * Spec: openspec/specs/analytics/spec.md (Same-origin ingest proxy,
 * Opt-out is honoured by the server proxy, Proxy strips identity
 * headers).
 *
 * Auth contract note: this route is INTENTIONALLY NOT gated by
 * `resolveUser()`. The spec is explicit that consent — not auth — is
 * the gate, because the proxy must drop unconsented requests at the edge
 * regardless of who is signed in. The static API auth-contract scan
 * (`tests/api-auth-contract.test.ts`) carries an allowlist entry for
 * this exact route.
 *
 * Behaviour:
 *   * 204 + Cache-Control: no-store on every request that lacks an
 *     `analyticsConsent=granted` cookie.
 *   * On consented requests, forwards the JSON body to the configured
 *     PostHog ingest URL with the project key attached server-side.
 *   * Strips the `x-user-email` header before forwarding (it must never
 *     reach PostHog).
 *   * If `ANALYTICS_DROP_IP=true`, also drops `x-forwarded-for` and
 *     `x-real-ip` headers.
 */

export const dynamic = "force-dynamic";

const DEFAULT_INGEST_URL = "https://eu.i.posthog.com";

function noStoreNoContent(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function handlePost(request: Request): Promise<NextResponse> {
  const cookieHeader = request.headers.get("cookie");
  const consent = readConsentFromCookieHeader(cookieHeader);
  if (consent !== "granted") {
    // No PostHog contact, no body forwarded. The cookie is the sole gate.
    void CONSENT_COOKIE_NAME; // referenced for tests / static analysis
    return noStoreNoContent();
  }

  const ingestUrl = (process.env.POSTHOG_INGEST_URL || DEFAULT_INGEST_URL).replace(
    /\/$/,
    "",
  );
  const projectKey = process.env.POSTHOG_PROJECT_KEY ?? null;
  const dropIp = process.env.ANALYTICS_DROP_IP === "true";

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  // Attach the project key server-side so the browser never holds it.
  // PostHog batch endpoints accept `api_key` either at the top level or
  // per-event; we inject at top level and leave any in-body value alone.
  const bodyWithKey =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>), api_key: projectKey }
      : { events: payload, api_key: projectKey };

  const forwardHeaders: Record<string, string> = {
    "content-type": "application/json",
  };
  // NEVER forward x-user-email or other identity headers to PostHog.
  // Forbid: x-user-email (per spec), authorisation cookies, IP-bearing
  // headers when ANALYTICS_DROP_IP=true.
  const userAgent = request.headers.get("user-agent");
  if (userAgent) forwardHeaders["user-agent"] = userAgent;
  if (!dropIp) {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) forwardHeaders["x-forwarded-for"] = fwd;
    const realIp = request.headers.get("x-real-ip");
    if (realIp) forwardHeaders["x-real-ip"] = realIp;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${ingestUrl}/i/v0/e/`, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(bodyWithKey),
    });
  } catch {
    // Treat upstream connectivity errors as a silent drop — analytics
    // must never break a user-facing flow.
    return noStoreNoContent();
  }

  // Mirror the upstream status (2xx pass-through; non-2xx still hides
  // the body to avoid leaking PostHog internals to the browser).
  const response = new NextResponse(null, { status: upstream.status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const POST = withRequestLogging(handlePost);
