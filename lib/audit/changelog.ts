import "server-only";

import { getSanityClient } from "@/lib/sanity/client";

export interface ChangeLogEntry {
  documentId: string;
  documentType: string;
  field: string;
  before: unknown;
  after: unknown;
}

/**
 * Write one ChangeLog row per entry. Used by the prompts API routes
 * after a Postgres write so the audit trail still lives in Sanity even
 * though the underlying data has moved. Failures here are logged but
 * not propagated — losing an audit row is preferable to failing the
 * user-visible mutation that has already been applied to Postgres.
 *
 * Spec: openspec/specs/change-tracking/spec.md.
 */
export async function writeChangeLog(
  entries: ChangeLogEntry[],
  userEmail: string,
): Promise<void> {
  if (entries.length === 0) return;
  const timestamp = new Date().toISOString();
  const client = getSanityClient();
  const transaction = client.transaction();
  for (const entry of entries) {
    transaction.create({
      _type: "changeLog",
      documentId: entry.documentId,
      documentType: entry.documentType,
      field: entry.field,
      before: JSON.stringify(entry.before ?? null),
      after: JSON.stringify(entry.after ?? null),
      userEmail,
      timestamp,
    });
  }
  try {
    await transaction.commit();
  } catch (error) {
    console.error("ChangeLog write failed (non-fatal):", error);
  }
}
