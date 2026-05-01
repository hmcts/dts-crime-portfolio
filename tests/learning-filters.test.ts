import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  applyLearningFilters,
  emptyLearningFilters,
  isLearningFiltersEmpty,
  parseLearningFilters,
} from "@/lib/learning/filters";
import type { LearningItem } from "@/lib/learning/types";

function item(overrides: Partial<LearningItem> & { _id: string }): LearningItem {
  return {
    type: "guide",
    title: overrides._id,
    body: null,
    tags: null,
    mediaUrl: null,
    readingTimeMinutes: null,
    level: null,
    featured: false,
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("emptyLearningFilters", () => {
  it("returns a fresh empty filter shape", () => {
    expect(emptyLearningFilters()).toEqual({ type: null, tags: [] });
  });

  it("isLearningFiltersEmpty agrees", () => {
    expect(isLearningFiltersEmpty(emptyLearningFilters())).toBe(true);
  });
});

describe("parseLearningFilters", () => {
  it("returns an empty filter shape when no params are supplied", () => {
    expect(parseLearningFilters({})).toEqual(emptyLearningFilters());
  });

  it("parses a single-select type", () => {
    expect(parseLearningFilters({ type: "video" }).type).toBe("video");
    expect(parseLearningFilters({ type: "guide" }).type).toBe("guide");
    expect(parseLearningFilters({ type: "playlist" }).type).toBe("playlist");
  });

  it("ignores unknown type values", () => {
    expect(parseLearningFilters({ type: "podcast" }).type).toBeNull();
    expect(parseLearningFilters({ type: "" }).type).toBeNull();
  });

  it("takes the first value when type is supplied as an array", () => {
    expect(parseLearningFilters({ type: ["video", "guide"] }).type).toBe("video");
  });

  it("parses comma-separated multi-tag values", () => {
    expect(parseLearningFilters({ tag: "#Prompting,#Eval" }).tags).toEqual([
      "#Prompting",
      "#Eval",
    ]);
  });

  it("parses repeated tag params (?tag=a&tag=b)", () => {
    expect(parseLearningFilters({ tag: ["#Prompting", "#Eval"] }).tags).toEqual([
      "#Prompting",
      "#Eval",
    ]);
  });

  it("trims whitespace and ignores empty entries", () => {
    expect(parseLearningFilters({ tag: " #a , , #b " }).tags).toEqual(["#a", "#b"]);
  });
});

describe("isLearningFiltersEmpty", () => {
  it("returns false when type is set", () => {
    expect(isLearningFiltersEmpty({ type: "video", tags: [] })).toBe(false);
  });

  it("returns false when tags are set", () => {
    expect(isLearningFiltersEmpty({ type: null, tags: ["#a"] })).toBe(false);
  });
});

describe("applyLearningFilters", () => {
  const items: LearningItem[] = [
    item({ _id: "v1", type: "video", tags: ["#Prompting"] }),
    item({ _id: "v2", type: "video", tags: ["#Prompting", "#Eval"] }),
    item({ _id: "g1", type: "guide", tags: ["#Prompting"] }),
    item({ _id: "p1", type: "playlist", tags: null }),
  ];

  it("returns every item when no filters are active", () => {
    expect(applyLearningFilters(items, { type: null, tags: [] }).map((i) => i._id)).toEqual([
      "v1",
      "v2",
      "g1",
      "p1",
    ]);
  });

  it("filters by single type", () => {
    expect(
      applyLearningFilters(items, { type: "video", tags: [] }).map((i) => i._id),
    ).toEqual(["v1", "v2"]);
  });

  it("filters by single tag", () => {
    expect(
      applyLearningFilters(items, { type: null, tags: ["#Prompting"] }).map((i) => i._id),
    ).toEqual(["v1", "v2", "g1"]);
  });

  it("requires every selected tag to be present (AND semantics)", () => {
    expect(
      applyLearningFilters(items, { type: null, tags: ["#Prompting", "#Eval"] }).map(
        (i) => i._id,
      ),
    ).toEqual(["v2"]);
  });

  it("combines type and tag filters", () => {
    expect(
      applyLearningFilters(items, { type: "video", tags: ["#Prompting"] }).map((i) => i._id),
    ).toEqual(["v1", "v2"]);
    expect(
      applyLearningFilters(items, { type: "guide", tags: ["#Prompting"] }).map((i) => i._id),
    ).toEqual(["g1"]);
  });

  it("excludes items with null tags when a tag filter is active", () => {
    expect(
      applyLearningFilters(items, { type: null, tags: ["#Prompting"] }).map((i) => i._id),
    ).not.toContain("p1");
  });
});
