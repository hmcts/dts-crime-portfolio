import "server-only";

import { getSanityClient } from "@/lib/sanity/client";

import { LEARNING_ITEM_QUERY, LEARNING_LIST_QUERY } from "./queries";
import type { LearningItem } from "./types";

/**
 * Fetch every published learning item, ordered featured-first then by
 * `_createdAt` descending. Type and tag filtering live in TypeScript
 * (`applyLearningFilters`) so the tag chip row can render the full union
 * of tags regardless of the active filter selection. Spec:
 * `openspec/specs/learning-hub/spec.md`.
 */
export async function listLearningItems(): Promise<LearningItem[]> {
  const client = getSanityClient();
  return client.fetch<LearningItem[]>(LEARNING_LIST_QUERY);
}

/**
 * Fetch a single learning item by id for the `/learning/[id]` placeholder
 * page. Returns `null` when the document does not exist.
 */
export async function fetchLearningItem(id: string): Promise<LearningItem | null> {
  const client = getSanityClient();
  return client.fetch<LearningItem | null>(LEARNING_ITEM_QUERY, { id });
}
