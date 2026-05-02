/**
 * Closed event catalogue for the portal's analytics layer.
 *
 * Spec: openspec/specs/analytics/spec.md (Closed event catalogue,
 * PII minimisation in event properties).
 *
 * Adding an event requires:
 *  1. a spec change against `analytics/spec.md`,
 *  2. a new entry in `AnalyticsEventMap` below.
 *
 * The `track()` function in `./client.ts` uses these types to enforce
 * exact, additive-only payloads at compile time.
 */

export type DossierOpenedSource = "portfolio" | "profile" | "direct_link";

export type ExportFormat = "excel" | "word" | "pptx";

export type ExportKind =
  | "portfolio"
  | "single_project"
  | "ownership"
  | "compliance"
  | "compare";

/**
 * Strict map of event name -> exact property shape. The catalogue is
 * "closed": event names not listed here cannot be tracked, and unknown
 * extra properties are rejected by `track()`'s generic constraint.
 */
export interface AnalyticsEventMap {
  page_view: { page: string; section: string };
  filter_applied: { page: string; filterKey: string; valueCount: number };
  dossier_opened: { projectId: string; source: DossierOpenedSource };
  export_generated: {
    format: ExportFormat;
    kind: ExportKind;
    redacted: boolean;
    projectCount: number;
  };
  prompt_upvoted: { promptId: string };
  prompt_commented: { promptId: string };
  submission_started: { entry: string };
  submission_completed: { projectId: string; calculatedTier: number };
  consent_granted: Record<string, never>;
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type AnalyticsEventProps<E extends AnalyticsEventName> = AnalyticsEventMap[E];

/** Runtime list of every catalogue name. Useful for guards and tests. */
export const ANALYTICS_EVENT_NAMES: readonly AnalyticsEventName[] = [
  "page_view",
  "filter_applied",
  "dossier_opened",
  "export_generated",
  "prompt_upvoted",
  "prompt_commented",
  "submission_started",
  "submission_completed",
  "consent_granted",
] as const;

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}
