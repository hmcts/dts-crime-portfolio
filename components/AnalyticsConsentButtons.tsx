"use client";

import { useRouter } from "next/navigation";

import {
  configureAnalytics,
  track,
} from "@/lib/analytics/client";
import { writeConsent } from "@/lib/analytics/consent";

/**
 * Client-side Accept / Decline controls for the analytics consent banner.
 *
 * Spec: openspec/specs/analytics/spec.md (Consent gate before any
 * analytics load — Visitor accepts / Visitor declines scenarios).
 *
 * On Accept:
 *   * persists `analyticsConsent: granted` in localStorage + cookie,
 *   * configures the analytics client with the userId/key/proxy mode
 *     supplied by the server-rendered banner,
 *   * fires a single `consent_granted` event with no PII,
 *   * triggers `router.refresh()` so the server-rendered `AnalyticsBanner`
 *     re-evaluates the now-set cookie and unmounts on its next render.
 *
 * On Decline:
 *   * persists `analyticsConsent: declined`,
 *   * does NOT load any SDK or fire any event,
 *   * triggers `router.refresh()` so the banner unmounts on the next
 *     server render.
 *
 * The banner element itself (the wrapping <div>) lives in the server
 * component `AnalyticsBanner`. That component reads the cookie at render
 * time and returns `null` once a decision is recorded, so the only way to
 * dismiss the banner without a navigation is to ask Next.js for a fresh
 * RSC payload — which is exactly what `router.refresh()` does. The cookie
 * remains the source of truth across navigations.
 */

export interface AnalyticsConsentButtonsProps {
  /** Stable hashed userId for the signed-in user, or null when none. */
  userId: string | null;
  /** PostHog project key (only used when ingestMode === "direct"). */
  projectKey: string | null;
  /** Direct or same-origin proxy. */
  ingestMode: "direct" | "proxy";
  /** PostHog ingest URL (used in direct mode). */
  ingestUrl: string;
}

/**
 * Dependencies the consent handlers need. Extracted so the handlers can be
 * unit-tested without rendering the component or pulling in the Next.js
 * router runtime.
 */
export interface ConsentHandlerDeps {
  writeConsent: (value: "granted" | "declined") => void;
  configureAnalytics: typeof configureAnalytics;
  track: typeof track;
  refresh: () => void;
  config: Pick<
    AnalyticsConsentButtonsProps,
    "userId" | "projectKey" | "ingestMode" | "ingestUrl"
  >;
}

/**
 * Accept handler. Persists consent, configures the client, fires the
 * `consent_granted` event, then asks the App Router to re-render the
 * server tree so the banner unmounts.
 */
export function acceptConsent(deps: ConsentHandlerDeps): void {
  deps.writeConsent("granted");
  deps.configureAnalytics({
    ingestMode: deps.config.ingestMode,
    ingestUrl: deps.config.ingestUrl,
    projectKey: deps.config.projectKey,
    userId: deps.config.userId,
  });
  deps.track("consent_granted");
  deps.refresh();
}

/**
 * Decline handler. Persists the decision and asks the App Router to
 * re-render the server tree so the banner unmounts. No SDK is loaded and
 * no event is sent.
 */
export function declineConsent(deps: ConsentHandlerDeps): void {
  deps.writeConsent("declined");
  deps.refresh();
}

export function AnalyticsConsentButtons(props: AnalyticsConsentButtonsProps) {
  const router = useRouter();

  const onAccept = () => {
    acceptConsent({
      writeConsent,
      configureAnalytics,
      track,
      refresh: () => router.refresh(),
      config: props,
    });
  };

  const onDecline = () => {
    declineConsent({
      writeConsent,
      configureAnalytics,
      track,
      refresh: () => router.refresh(),
      config: props,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onAccept}
        className="rounded-md border border-slate-400 bg-white px-3 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50"
      >
        Accept analytics
      </button>
      <button
        type="button"
        onClick={onDecline}
        className="rounded-md border border-slate-400 bg-white px-3 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50"
      >
        Decline
      </button>
    </div>
  );
}
