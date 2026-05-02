import { cookies } from "next/headers";

import { resolveUser } from "@/lib/auth/resolver";
import { computeAnalyticsUserId } from "@/lib/analytics/identify";
import { CONSENT_COOKIE_NAME } from "@/lib/analytics/consent";

import { AnalyticsConsentButtons } from "./AnalyticsConsentButtons";

/**
 * Server-rendered analytics consent banner. Shown only when the user
 * has not yet recorded a consent decision in the `analyticsConsent`
 * cookie. Spec: openspec/specs/analytics/spec.md.
 */
export async function AnalyticsBanner() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CONSENT_COOKIE_NAME)?.value;
  if (existing === "granted" || existing === "declined") {
    return null;
  }

  const ingestMode = (process.env.ANALYTICS_INGEST_MODE === "proxy" ? "proxy" : "direct") as
    | "direct"
    | "proxy";
  const ingestUrl =
    process.env.POSTHOG_INGEST_URL ?? "https://eu.i.posthog.com";
  const projectKey = process.env.POSTHOG_PROJECT_KEY ?? null;

  let userId: string | null = null;
  try {
    const user = await resolveUser();
    if (user.kind === "authorized" && process.env.ANALYTICS_USER_ID_PEPPER) {
      userId = await computeAnalyticsUserId(user.email, process.env.ANALYTICS_USER_ID_PEPPER);
    }
  } catch {
    // Resolver failure is non-fatal — banner still renders, userId stays null.
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-800">
      <p className="max-w-2xl">
        <strong className="font-semibold">Analytics:</strong> we&apos;d like to record anonymised
        usage events to improve the portal. No personal information is sent. You can change this
        anytime under <span className="font-semibold">Profile → Analytics</span>.
      </p>
      <AnalyticsConsentButtons
        userId={userId}
        projectKey={projectKey}
        ingestMode={ingestMode}
        ingestUrl={ingestUrl}
      />
    </div>
  );
}
