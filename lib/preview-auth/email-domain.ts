/**
 * Preview-auth domain restriction.
 *
 * The preview deployment is for HMCTS / MoJ staff only. Sign-in is
 * limited to email addresses ending in one of `ALLOWED_PREVIEW_AUTH_DOMAINS`.
 * Both client-side (UX feedback) and server-side (security-of-record)
 * validation reuse this helper, so the rules can never drift.
 *
 * Spec: openspec/changes/add-preview-auth/specs/preview-auth/spec.md
 * (Domain restriction on the sign-in surface).
 */

export const ALLOWED_PREVIEW_AUTH_DOMAINS = ["hmcts.net", "justice.gov.uk"] as const;

export type AllowedPreviewAuthDomain = (typeof ALLOWED_PREVIEW_AUTH_DOMAINS)[number];

/**
 * Returns true iff `email` is non-empty, has a single `@`, and the part
 * after the `@` exactly matches one of the allowed domains
 * (case-insensitive, whitespace-trimmed). Anything else — empty input,
 * missing `@`, multiple `@`, similar-looking domains
 * (`hmcts.net.example.com`, `justice.gov.uk.evil.com`, `hmcts.com`) —
 * returns false.
 *
 * This is a domain check only. Email *format* validation lives in
 * `isValidEmail` from `lib/auth/resolver.ts` and stays in front of this
 * helper at every callsite. Keep the responsibilities separate.
 */
export function isAllowedPreviewAuthDomain(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;

  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex < 0) return false;
  if (atIndex === 0 || atIndex === trimmed.length - 1) return false;
  // Reject more than one `@` outright — a real email has exactly one.
  if (trimmed.indexOf("@") !== atIndex) return false;

  const domain = trimmed.slice(atIndex + 1).toLowerCase();
  return ALLOWED_PREVIEW_AUTH_DOMAINS.some((allowed) => domain === allowed);
}

/**
 * Human-readable list of allowed domains, joined for UI copy. Mirrors
 * the order of `ALLOWED_PREVIEW_AUTH_DOMAINS` so we don't reorder copy
 * by accident.
 */
export function formatAllowedDomainsForCopy(): string {
  return ALLOWED_PREVIEW_AUTH_DOMAINS.map((d) => `@${d}`).join(" or ");
}
