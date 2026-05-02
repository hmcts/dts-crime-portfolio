"use client";

import { useState, useTransition } from "react";

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
 *   * fires a single `consent_granted` event with no PII.
 *
 * On Decline:
 *   * persists `analyticsConsent: declined`,
 *   * does NOT load any SDK or fire any event.
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

export function AnalyticsConsentButtons(props: AnalyticsConsentButtonsProps) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  if (hidden) return null;

  const onAccept = () => {
    writeConsent("granted");
    configureAnalytics({
      ingestMode: props.ingestMode,
      ingestUrl: props.ingestUrl,
      projectKey: props.projectKey,
      userId: props.userId,
    });
    track("consent_granted");
    startTransition(() => setHidden(true));
  };

  const onDecline = () => {
    writeConsent("declined");
    startTransition(() => setHidden(true));
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
