import "server-only";

import { logger } from "@/lib/logging/logger";
import { getSanityClient } from "@/lib/sanity/client";

/**
 * Record a preview-auth sign-in. First sign-in for an email creates a
 * `previewSession` document; repeat sign-ins update `lastSeenAt` on the
 * existing one. Spec: openspec/specs/preview-auth/spec.md
 * (Audit of preview identity).
 */
export async function recordPreviewSession(email: string): Promise<void> {
  const client = getSanityClient();
  const now = new Date().toISOString();

  const existing = await client.fetch<{ _id: string } | null>(
    `*[_type == "previewSession" && email == $email][0]{ _id }`,
    { email },
  );

  if (existing) {
    await client.patch(existing._id).set({ lastSeenAt: now }).commit({ visibility: "async" });
  } else {
    await client.create({
      _type: "previewSession",
      email,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }
}

export type PreviewAuthRejectionReason = "invalid-format" | "disallowed-domain";

/**
 * Log a rejected sign-in attempt. Only the *domain* part of the rejected
 * email and the rejection reason are logged — never the local-part — so
 * the audit trail does not leak personal email handles for non-staff
 * visitors.
 *
 * For empty / malformed inputs with no recoverable domain, `domain` is
 * recorded as `null`.
 */
export function recordPreviewAuthRejection(
  rawEmail: string,
  reason: PreviewAuthRejectionReason,
): void {
  const trimmed = rawEmail.trim();
  const atIndex = trimmed.lastIndexOf("@");
  const domain =
    atIndex > 0 && atIndex < trimmed.length - 1 ? trimmed.slice(atIndex + 1).toLowerCase() : null;

  logger.warn("preview_auth.rejected_domain", {
    event_kind: "preview_auth_reject",
    reason,
    domain,
  });
}
