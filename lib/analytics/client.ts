"use client";

import {
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsEventProps,
} from "./events";
import { CONSENT_COOKIE_NAME, readConsent } from "./consent";

/**
 * Client-side typed analytics tracker.
 *
 * Spec: openspec/specs/analytics/spec.md (Closed event catalogue,
 * Same-origin ingest proxy, Consent gate before any analytics load).
 *
 * No PostHog SDK dependency — events are POSTed via fetch directly to
 * the ingest URL, or to `/api/analytics/ingest` when the proxy mode is
 * enabled. The PostHog batch capture endpoint is documented at
 * https://posthog.com/docs/api/post-only-endpoints.
 *
 * Calls are silently dropped unless `analyticsConsent === "granted"`.
 * The track() function NEVER throws to its caller — analytics must
 * never break a user-facing action.
 */

interface AnalyticsRuntimeConfig {
  ingestMode: "direct" | "proxy";
  ingestUrl: string;
  projectKey: string | null;
  userId: string | null;
  /** When true, used by tests/profile to short-circuit consent reads. */
  forceDecision?: "granted" | "declined";
}

let runtimeConfig: AnalyticsRuntimeConfig | null = null;

/**
 * Configure the client. Must be called once per page load (or when consent
 * changes). The page provides the userId; the userId is pre-hashed by the
 * server (see `lib/analytics/identify.ts`).
 */
export function configureAnalytics(config: Partial<AnalyticsRuntimeConfig>): void {
  runtimeConfig = {
    ingestMode: config.ingestMode ?? runtimeConfig?.ingestMode ?? "direct",
    ingestUrl:
      config.ingestUrl ?? runtimeConfig?.ingestUrl ?? "https://eu.i.posthog.com",
    projectKey: config.projectKey ?? runtimeConfig?.projectKey ?? null,
    userId: config.userId ?? runtimeConfig?.userId ?? null,
    forceDecision: config.forceDecision ?? runtimeConfig?.forceDecision,
  };
}

function isConsentGranted(): boolean {
  if (runtimeConfig?.forceDecision) return runtimeConfig.forceDecision === "granted";
  return readConsent() === "granted";
}

/**
 * Type-safe tracker. The `event` parameter is a literal union of catalogue
 * names; `props` is required and constrained to the exact shape declared
 * in the catalogue. Adding extra properties or omitting required ones
 * fails at compile time.
 */
export function track<E extends AnalyticsEventName>(
  event: E,
  props: AnalyticsEventProps<E>,
): void;
// Overload accommodating the empty-payload `consent_granted` event so
// callers can write `track("consent_granted")` without an empty object.
export function track(event: "consent_granted"): void;
export function track<E extends AnalyticsEventName>(
  event: E,
  props?: AnalyticsEventProps<E>,
): void {
  if (!isConsentGranted()) return;
  if (!runtimeConfig) return;

  // Defensively coerce missing props for the empty-payload event.
  const payloadProps = (props ?? ({} as AnalyticsEventProps<E>)) as Record<
    string,
    unknown
  >;

  void postEvent(event, payloadProps).catch(() => {
    // Analytics failures must never propagate. Swallow and move on.
  });
}

async function postEvent(event: string, properties: Record<string, unknown>) {
  if (!runtimeConfig) return;
  const body = {
    api_key: runtimeConfig.projectKey ?? undefined,
    event,
    distinct_id: runtimeConfig.userId ?? "anonymous",
    properties: { ...properties, $consent: "granted" },
    timestamp: new Date().toISOString(),
  };

  const targetUrl =
    runtimeConfig.ingestMode === "proxy"
      ? "/api/analytics/ingest"
      : `${runtimeConfig.ingestUrl.replace(/\/$/, "")}/i/v0/e/`;

  await fetch(targetUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify(body),
  });
}

/**
 * Returns true once consent has been granted. The component shell uses
 * this in conjunction with `configureAnalytics()` to decide whether to
 * fire the initial `page_view` and `consent_granted` events.
 */
export function isAnalyticsActive(): boolean {
  return isConsentGranted() && runtimeConfig !== null;
}

// Re-export the cookie name for the consent banner / proxy gate.
export { CONSENT_COOKIE_NAME };
// Re-export AnalyticsEventMap so the type is reachable via the client.
export type { AnalyticsEventMap };
