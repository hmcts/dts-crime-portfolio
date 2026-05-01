import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { unionLearningTags } from "@/lib/learning/tags";
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

describe("unionLearningTags", () => {
  it("returns an empty array when no items are supplied", () => {
    expect(unionLearningTags([])).toEqual([]);
  });

  it("returns an empty array when no item has tags", () => {
    expect(
      unionLearningTags([item({ _id: "a", tags: null }), item({ _id: "b", tags: [] })]),
    ).toEqual([]);
  });

  it("deduplicates across items", () => {
    expect(
      unionLearningTags([
        item({ _id: "a", tags: ["#Prompting", "#Eval"] }),
        item({ _id: "b", tags: ["#Prompting"] }),
      ]),
    ).toEqual(["#Eval", "#Prompting"]);
  });

  it("sorts case-insensitively", () => {
    expect(
      unionLearningTags([
        item({ _id: "a", tags: ["#zeta", "#Alpha", "#beta"] }),
      ]),
    ).toEqual(["#Alpha", "#beta", "#zeta"]);
  });

  it("trims whitespace and discards empty entries", () => {
    expect(
      unionLearningTags([
        item({ _id: "a", tags: ["  #Prompting  ", "", "   ", "#Eval"] }),
      ]),
    ).toEqual(["#Eval", "#Prompting"]);
  });
});
