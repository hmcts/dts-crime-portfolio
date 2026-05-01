import type { LearningItem } from "./types";

/**
 * Compute the union of `tags` across every learning item, deduplicated and
 * sorted alphabetically (case-insensitive). Used to render the tag chip
 * row server-side. Spec: `openspec/specs/learning-hub/spec.md` — "Tag
 * filtering" surfaces hashtag chips drawn from the active items.
 */
export function unionLearningTags(items: LearningItem[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const tags = item.tags ?? [];
    for (const tag of tags) {
      const trimmed = tag.trim();
      if (trimmed) seen.add(trimmed);
    }
  }
  return Array.from(seen).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}
