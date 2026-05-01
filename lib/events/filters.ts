/**
 * URL-driven filter state for the /events listing. Mirrors the portfolio
 * filter parsing pattern but only supports single-select category and
 * location plus a free-text search.
 *
 * Spec: openspec/specs/events-listing/spec.md (Filters).
 */

export interface EventsFilters {
  category: string;
  location: string;
  search: string;
}

export type EventsFilterSearchParams = Record<string, string | string[] | undefined>;

const KEYS = {
  category: "category",
  location: "location",
  search: "q",
} as const;

export function emptyEventsFilters(): EventsFilters {
  return { category: "", location: "", search: "" };
}

export function parseEventsFilters(params: EventsFilterSearchParams): EventsFilters {
  return {
    category: readSingle(params, KEYS.category).trim(),
    location: readSingle(params, KEYS.location).trim(),
    search: readSingle(params, KEYS.search).trim(),
  };
}

export function isEventsFiltersEmpty(filters: EventsFilters): boolean {
  return filters.category === "" && filters.location === "" && filters.search === "";
}

function readSingle(params: EventsFilterSearchParams, key: string): string {
  const value = params[key];
  if (value === undefined) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}
