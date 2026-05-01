import { isLearningType, type LearningItem, type LearningType } from "./types";

/**
 * Filter state for `/learning`. Mirrored to the URL query string so the
 * grid is bookmarkable.
 *
 * - `type` is single-select via `?type=` (one of the four pills).
 * - `tags` are multi-select via `?tag=` (comma-separated or repeated).
 *
 * Spec: `openspec/specs/learning-hub/spec.md` — Type filter and Tag
 * filtering requirements.
 */
export interface LearningFilters {
  type: LearningType | null;
  tags: string[];
}

export type LearningFilterSearchParams = Record<string, string | string[] | undefined>;

const TYPE_KEY = "type";
const TAG_KEY = "tag";

export function emptyLearningFilters(): LearningFilters {
  return { type: null, tags: [] };
}

export function parseLearningFilters(
  params: LearningFilterSearchParams,
): LearningFilters {
  const rawType = readSingle(params, TYPE_KEY);
  const type = isLearningType(rawType) ? rawType : null;
  const tags = readMulti(params, TAG_KEY);
  return { type, tags };
}

export function isLearningFiltersEmpty(filters: LearningFilters): boolean {
  return filters.type === null && filters.tags.length === 0;
}

/**
 * Apply the current filter state to a list of items. Type matches a
 * single value; tags require ALL selected tags to be present (AND
 * semantics, per the spec's multi-tag scenario).
 */
export function applyLearningFilters(
  items: LearningItem[],
  filters: LearningFilters,
): LearningItem[] {
  return items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false;
    if (filters.tags.length === 0) return true;
    const itemTags = item.tags ?? [];
    return filters.tags.every((tag) => itemTags.includes(tag));
  });
}

function readMulti(params: LearningFilterSearchParams, key: string): string[] {
  const value = params[key];
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readSingle(params: LearningFilterSearchParams, key: string): string {
  const value = params[key];
  if (value === undefined) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}
