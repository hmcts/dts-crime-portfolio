"use client";

import { useEffect, useRef } from "react";

import type { EventsFilters } from "@/lib/events/filters";

/**
 * Filter bar for /events. Native <select> elements inside a GET form so the
 * UI degrades cleanly without JavaScript. A small client hook auto-submits
 * the form when a select changes, while preserving the search query
 * already in the URL (the SearchInput keeps its own debounced behaviour).
 *
 * Spec: openspec/specs/events-listing/spec.md (Category and Location
 * dropdowns).
 */
interface EventFiltersProps {
  filters: EventsFilters;
  categories: string[];
  locations: string[];
}

export function EventFilters({ filters, categories, locations }: EventFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!formRef.current) return;
    const form = formRef.current;
    function handleChange(event: Event) {
      const target = event.target as HTMLElement | null;
      if (target && target.tagName === "SELECT") {
        form.requestSubmit();
      }
    }
    form.addEventListener("change", handleChange);
    return () => form.removeEventListener("change", handleChange);
  }, []);

  return (
    <form
      ref={formRef}
      method="get"
      action="/events"
      className="flex flex-wrap items-end gap-3"
      aria-label="Event filters"
    >
      {/* Preserve the current search term across native form submits. The
          SearchInput owns the live editing experience, but if the user is
          on a URL with ?q=… we don't want changing a filter to drop it. */}
      {filters.search && <input type="hidden" name="q" value={filters.search} />}
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
        Category
        <select
          name="category"
          defaultValue={filters.category}
          className="min-w-40 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
        Location
        <select
          name="location"
          defaultValue={filters.location}
          className="min-w-40 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          Apply
        </button>
      </noscript>
    </form>
  );
}
