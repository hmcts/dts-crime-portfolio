import { describe, expect, it } from "vitest";

import {
  emptyEventsFilters,
  isEventsFiltersEmpty,
  parseEventsFilters,
} from "@/lib/events/filters";

describe("parseEventsFilters", () => {
  it("returns empty filters when no params supplied", () => {
    expect(parseEventsFilters({})).toEqual(emptyEventsFilters());
  });

  it("reads category, location, and q as single-select strings", () => {
    expect(
      parseEventsFilters({ category: "Workshop", location: "London", q: "AI" }),
    ).toEqual({ category: "Workshop", location: "London", search: "AI" });
  });

  it("trims whitespace around the search term", () => {
    expect(parseEventsFilters({ q: "  policy  " })).toEqual({
      category: "",
      location: "",
      search: "policy",
    });
  });

  it("uses the first value when an array is supplied", () => {
    expect(
      parseEventsFilters({ category: ["Workshop", "Show & Tell"] }),
    ).toEqual({ category: "Workshop", location: "", search: "" });
  });

  it("treats an empty array as an empty filter", () => {
    expect(parseEventsFilters({ location: [] })).toEqual(emptyEventsFilters());
  });
});

describe("isEventsFiltersEmpty", () => {
  it("is true for an empty filter object", () => {
    expect(isEventsFiltersEmpty(emptyEventsFilters())).toBe(true);
  });

  it("is false when any field is set", () => {
    expect(
      isEventsFiltersEmpty({ category: "Workshop", location: "", search: "" }),
    ).toBe(false);
    expect(
      isEventsFiltersEmpty({ category: "", location: "London", search: "" }),
    ).toBe(false);
    expect(
      isEventsFiltersEmpty({ category: "", location: "", search: "AI" }),
    ).toBe(false);
  });
});
