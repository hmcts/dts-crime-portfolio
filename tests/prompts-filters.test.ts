import { describe, expect, it } from "vitest";

import {
  applyPromptFilters,
  emptyPromptFilters,
  formatCompetitionMonth,
  isPromptFiltersDefault,
  parsePromptFilters,
  sortPrompts,
} from "@/lib/prompts/filters";
import type { PromptListItem } from "@/lib/prompts/types";

function prompt(overrides: Partial<PromptListItem> & { _id: string }): PromptListItem {
  return {
    title: overrides._id,
    summary: null,
    body: "body",
    tool: "copilot",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    authorName: "Author",
    upvoteCount: 0,
    commentCount: 0,
    competitionMonth: null,
    ...overrides,
  };
}

describe("emptyPromptFilters", () => {
  it("returns the default filter shape", () => {
    expect(emptyPromptFilters()).toEqual({
      tags: [],
      tool: null,
      sort: "recommended",
    });
  });

  it("isPromptFiltersDefault agrees", () => {
    expect(isPromptFiltersDefault(emptyPromptFilters())).toBe(true);
  });
});

describe("parsePromptFilters", () => {
  it("returns an empty filter shape when no params are supplied", () => {
    expect(parsePromptFilters({})).toEqual(emptyPromptFilters());
  });

  it("parses comma-separated tag values", () => {
    const filters = parsePromptFilters({ tag: "#HR,#Tech" });
    expect(filters.tags).toEqual(["#HR", "#Tech"]);
  });

  it("parses repeated tag params (?tag=#HR&tag=#Tech)", () => {
    const filters = parsePromptFilters({ tag: ["#HR", "#Tech"] });
    expect(filters.tags).toEqual(["#HR", "#Tech"]);
  });

  it("ignores unknown tags", () => {
    expect(parsePromptFilters({ tag: "#HR,#Invented" }).tags).toEqual(["#HR"]);
  });

  it("trims whitespace and ignores empty tag entries", () => {
    expect(parsePromptFilters({ tag: " #HR ,, #Tech " }).tags).toEqual(["#HR", "#Tech"]);
  });

  it("parses a known tool value", () => {
    expect(parsePromptFilters({ tool: "copilot" }).tool).toBe("copilot");
  });

  it("ignores an unknown tool value", () => {
    expect(parsePromptFilters({ tool: "made-up" }).tool).toBeNull();
  });

  it("ignores an unknown sort value and falls back to recommended", () => {
    expect(parsePromptFilters({ sort: "bogus" }).sort).toBe("recommended");
  });

  it("accepts each known sort value", () => {
    for (const sort of ["recommended", "upvotes", "new", "comments"]) {
      expect(parsePromptFilters({ sort }).sort).toBe(sort);
    }
  });
});

describe("isPromptFiltersDefault", () => {
  it("returns false when a tag is selected", () => {
    expect(isPromptFiltersDefault({ ...emptyPromptFilters(), tags: ["#HR"] })).toBe(false);
  });

  it("returns false when a tool is selected", () => {
    expect(isPromptFiltersDefault({ ...emptyPromptFilters(), tool: "claude" })).toBe(false);
  });

  it("returns false when sort is non-default", () => {
    expect(isPromptFiltersDefault({ ...emptyPromptFilters(), sort: "new" })).toBe(false);
  });
});

describe("formatCompetitionMonth", () => {
  it("returns YYYY-MM zero-padded", () => {
    expect(formatCompetitionMonth(new Date(Date.UTC(2026, 0, 15)))).toBe("2026-01");
    expect(formatCompetitionMonth(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12");
  });
});

describe("applyPromptFilters: tag and tool filtering", () => {
  const prompts: PromptListItem[] = [
    prompt({ _id: "a", tool: "copilot", tags: ["#HR"] }),
    prompt({ _id: "b", tool: "claude", tags: ["#HR", "#Tech"] }),
    prompt({ _id: "c", tool: "claude", tags: ["#Tech"] }),
  ];

  it("filters by a single tag", () => {
    const result = applyPromptFilters(
      prompts,
      { tags: ["#HR"], tool: null, sort: "new" },
      { currentMonth: "2026-01" },
    );
    expect(result.map((p) => p._id).sort()).toEqual(["a", "b"]);
  });

  it("filters by intersection of multiple tags", () => {
    const result = applyPromptFilters(
      prompts,
      { tags: ["#HR", "#Tech"], tool: null, sort: "new" },
      { currentMonth: "2026-01" },
    );
    expect(result.map((p) => p._id)).toEqual(["b"]);
  });

  it("filters by tool", () => {
    const result = applyPromptFilters(
      prompts,
      { tags: [], tool: "claude", sort: "new" },
      { currentMonth: "2026-01" },
    );
    expect(result.map((p) => p._id).sort()).toEqual(["b", "c"]);
  });

  it("intersects tag and tool filters", () => {
    const result = applyPromptFilters(
      prompts,
      { tags: ["#HR"], tool: "claude", sort: "new" },
      { currentMonth: "2026-01" },
    );
    expect(result.map((p) => p._id)).toEqual(["b"]);
  });
});

describe("sortPrompts", () => {
  const base: PromptListItem[] = [
    prompt({
      _id: "a",
      upvoteCount: 5,
      commentCount: 1,
      createdAt: "2026-04-01T00:00:00.000Z",
    }),
    prompt({
      _id: "b",
      upvoteCount: 10,
      commentCount: 0,
      createdAt: "2026-03-01T00:00:00.000Z",
    }),
    prompt({
      _id: "c",
      upvoteCount: 3,
      commentCount: 4,
      createdAt: "2026-05-15T00:00:00.000Z",
    }),
    prompt({
      _id: "d",
      upvoteCount: 10,
      commentCount: 4,
      createdAt: "2026-02-01T00:00:00.000Z",
      competitionMonth: "2026-05",
    }),
  ];

  it("sorts upvotes desc with createdAt desc tie-break", () => {
    const result = sortPrompts(base, "upvotes", "2026-05");
    // 10:b (Mar) and 10:d (Feb) both top — Mar is later so b first, then d.
    // Then 5:a, then 3:c.
    expect(result.map((p) => p._id)).toEqual(["b", "d", "a", "c"]);
  });

  it("sorts new by createdAt desc", () => {
    const result = sortPrompts(base, "new", "2026-05");
    expect(result.map((p) => p._id)).toEqual(["c", "a", "b", "d"]);
  });

  it("sorts comments desc with createdAt desc tie-break", () => {
    const result = sortPrompts(base, "comments", "2026-05");
    // 4:c (May) and 4:d (Feb) tie — May later, c first.
    // Then 1:a, then 0:b.
    expect(result.map((p) => p._id)).toEqual(["c", "d", "a", "b"]);
  });

  it("recommended pins the current-month winner first then sorts by upvotes desc", () => {
    const result = sortPrompts(base, "recommended", "2026-05");
    // d wins regardless of upvotes (current month winner). Then 10:b, 5:a, 3:c.
    expect(result.map((p) => p._id)).toEqual(["d", "b", "a", "c"]);
  });

  it("recommended falls back to upvotes order when no winner this month", () => {
    const result = sortPrompts(base, "recommended", "2026-12");
    expect(result.map((p) => p._id)).toEqual(["b", "d", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [...base];
    sortPrompts(input, "upvotes", "2026-05");
    expect(input.map((p) => p._id)).toEqual(["a", "b", "c", "d"]);
  });

  it("falls back to a stable id-based tie-break when dates and counts collide", () => {
    const tied: PromptListItem[] = [
      prompt({ _id: "z", upvoteCount: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
      prompt({ _id: "a", upvoteCount: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const result = sortPrompts(tied, "upvotes", "2026-05");
    expect(result.map((p) => p._id)).toEqual(["a", "z"]);
  });
});
