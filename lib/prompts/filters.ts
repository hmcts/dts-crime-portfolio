import {
  DEFAULT_PROMPT_SORT,
  PROMPT_SORTS,
  PROMPT_TAGS,
  PROMPT_TOOLS,
  type PromptListItem,
  type PromptSort,
  type PromptTag,
  type PromptTool,
} from "./types";

/**
 * URL-bound filter state for `/prompts`. Mirrors the patterns used by
 * `/portfolio` — multi-select for tags via comma-separated `?tag=`, single
 * select for tool, single select for sort. Spec:
 * `openspec/specs/prompts-library/spec.md`.
 */
export interface PromptFilters {
  tags: PromptTag[];
  tool: PromptTool | null;
  sort: PromptSort;
}

export type PromptFilterSearchParams = Record<string, string | string[] | undefined>;

const KEYS = {
  tag: "tag",
  tool: "tool",
  sort: "sort",
} as const;

export function emptyPromptFilters(): PromptFilters {
  return {
    tags: [],
    tool: null,
    sort: DEFAULT_PROMPT_SORT,
  };
}

export function parsePromptFilters(params: PromptFilterSearchParams): PromptFilters {
  const tags = readMulti(params, KEYS.tag).filter(isPromptTag);
  const toolRaw = readSingle(params, KEYS.tool);
  const sortRaw = readSingle(params, KEYS.sort);
  return {
    tags,
    tool: isPromptTool(toolRaw) ? toolRaw : null,
    sort: isPromptSort(sortRaw) ? sortRaw : DEFAULT_PROMPT_SORT,
  };
}

export function isPromptFiltersDefault(filters: PromptFilters): boolean {
  return (
    filters.tags.length === 0 &&
    filters.tool === null &&
    filters.sort === DEFAULT_PROMPT_SORT
  );
}

function isPromptTag(value: string): value is PromptTag {
  return (PROMPT_TAGS as readonly string[]).includes(value);
}

function isPromptTool(value: string): value is PromptTool {
  return (PROMPT_TOOLS as readonly string[]).includes(value);
}

function isPromptSort(value: string): value is PromptSort {
  return (PROMPT_SORTS as readonly string[]).includes(value);
}

function readMulti(params: PromptFilterSearchParams, key: string): string[] {
  const value = params[key];
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readSingle(params: PromptFilterSearchParams, key: string): string {
  const value = params[key];
  if (value === undefined) return "";
  return (Array.isArray(value) ? (value[0] ?? "") : value).trim();
}

/**
 * Apply the in-memory filters and sort. Filtering for tags/tool happens
 * here as well as in GROQ so the unit tests can exercise the matrix
 * without a Sanity round-trip.
 */
export function applyPromptFilters(
  prompts: PromptListItem[],
  filters: PromptFilters,
  options: { currentMonth: string },
): PromptListItem[] {
  const filtered = prompts.filter((prompt) => {
    if (filters.tool && prompt.tool !== filters.tool) return false;
    if (filters.tags.length > 0) {
      const promptTags = new Set(prompt.tags);
      for (const tag of filters.tags) {
        if (!promptTags.has(tag)) return false;
      }
    }
    return true;
  });
  return sortPrompts(filtered, filters.sort, options.currentMonth);
}

/**
 * Sort prompts by the given sort key. Recommended places this month's
 * competition winner first (any prompt whose `competitionMonth` matches
 * `currentMonth`), then orders by upvote count desc with createdAt desc
 * as the tie-break.
 */
export function sortPrompts(
  prompts: PromptListItem[],
  sort: PromptSort,
  currentMonth: string,
): PromptListItem[] {
  const copy = [...prompts];
  switch (sort) {
    case "upvotes":
      return copy.sort(
        (a, b) =>
          b.upvoteCount - a.upvoteCount ||
          createdAtDescCompare(a.createdAt, b.createdAt) ||
          a._id.localeCompare(b._id),
      );
    case "new":
      return copy.sort(
        (a, b) =>
          createdAtDescCompare(a.createdAt, b.createdAt) || a._id.localeCompare(b._id),
      );
    case "comments":
      return copy.sort(
        (a, b) =>
          b.commentCount - a.commentCount ||
          createdAtDescCompare(a.createdAt, b.createdAt) ||
          a._id.localeCompare(b._id),
      );
    case "recommended":
    default:
      return copy.sort((a, b) => {
        const aWinner = a.competitionMonth === currentMonth ? 1 : 0;
        const bWinner = b.competitionMonth === currentMonth ? 1 : 0;
        if (aWinner !== bWinner) return bWinner - aWinner;
        return (
          b.upvoteCount - a.upvoteCount ||
          createdAtDescCompare(a.createdAt, b.createdAt) ||
          a._id.localeCompare(b._id)
        );
      });
  }
}

function createdAtDescCompare(a: string | null, b: string | null): number {
  const aTime = parseDate(a);
  const bTime = parseDate(b);
  return bTime - aTime;
}

function parseDate(value: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Render `YYYY-MM` for a given date. Used to pin this month's winning
 * prompt to the top of the Recommended sort and to drive the banner.
 */
export function formatCompetitionMonth(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}
