import "server-only";

import type { SanityClient, Transaction } from "@sanity/client";
import { getSanityClient } from "./client";

export interface FieldChange {
  /** Sanity document `_id` of the affected document. */
  documentId: string;
  /** Sanity `_type` of the affected document. */
  documentType: string;
  /** Dotted path to the field, e.g. `tieringAssessment.dataStorage`. */
  field: string;
  /** Value before the change. Will be JSON-encoded for storage. */
  before: unknown;
  /** Value after the change. Will be JSON-encoded for storage. */
  after: unknown;
}

export interface CommitWithChangeLogArgs {
  /**
   * Caller-provided callback that adds the actual content mutations to the
   * transaction. The same transaction object is then used to append the
   * ChangeLog rows so everything commits atomically.
   */
  mutations: (transaction: Transaction) => Transaction | void;
  /** One entry per mutated field. The helper writes one ChangeLog row each. */
  changes: FieldChange[];
  /**
   * Resolved from the `x-user-email` request header by the auth resolver.
   * Never trusted from a request body. Recorded on every ChangeLog row.
   */
  userEmail: string;
  /**
   * Optional client override, mainly for tests. Defaults to the shared
   * server-side client returned by getSanityClient().
   */
  client?: SanityClient;
}

/**
 * Apply mutations and write one ChangeLog row per field change in a single
 * Sanity transaction. If either side fails, neither is persisted.
 *
 * Spec: openspec/specs/change-tracking/spec.md (ChangeLog row per mutation)
 * and openspec/specs/edit-studio/spec.md (Failed save rolls back log).
 */
export async function commitWithChangeLog(args: CommitWithChangeLogArgs): Promise<void> {
  const client = args.client ?? getSanityClient();
  const transaction = client.transaction();
  args.mutations(transaction);
  const timestamp = new Date().toISOString();
  for (const change of args.changes) {
    transaction.create({
      _type: "changeLog",
      documentId: change.documentId,
      documentType: change.documentType,
      field: change.field,
      before: JSON.stringify(change.before ?? null),
      after: JSON.stringify(change.after ?? null),
      userEmail: args.userEmail,
      timestamp,
    });
  }
  await transaction.commit();
}
