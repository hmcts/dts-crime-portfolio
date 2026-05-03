import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  filterFaqEntries,
  groupFaqEntriesBySection,
  portableTextToPlain,
  type FaqEntry,
  type FaqSection,
} from "@/lib/help/list";
import { FAQ_SECTIONS } from "@/lib/help/sections";

function entry(overrides: Partial<FaqEntry> & { _id: string; section: FaqSection }): FaqEntry {
  return {
    number: 1,
    question: `q-${overrides._id}`,
    answer: null,
    ...overrides,
  };
}

function paragraph(text: string) {
  return {
    _type: "block",
    _key: text,
    style: "normal",
    children: [{ _type: "span", _key: `${text}-span`, text, marks: [] }],
    markDefs: [],
  };
}

describe("FAQ_SECTIONS", () => {
  it("exposes the ten spec-defined sections in order", () => {
    expect(FAQ_SECTIONS).toEqual([
      "1. Getting started",
      "2. Using AI tools effectively",
      "3. Acceptable use",
      "4. Context and knowledge",
      "5. Data security and privacy",
      "6. Copyright",
      "7. Ethics and public service values",
      "8. Environment",
      "9. Workforce and responsibility",
      "10. Overall AI strategy and portfolio",
    ]);
  });
});

describe("groupFaqEntriesBySection", () => {
  it("seeds every spec section with an empty array when no entries are passed", () => {
    const result = groupFaqEntriesBySection([]);
    for (const section of FAQ_SECTIONS) {
      expect(result[section]).toEqual([]);
    }
  });

  it("places each entry under its declared section", () => {
    const result = groupFaqEntriesBySection([
      entry({ _id: "a", section: "1. Getting started" }),
      entry({ _id: "b", section: "3. Acceptable use" }),
      entry({ _id: "c", section: "1. Getting started" }),
    ]);
    expect(result["1. Getting started"].map((e) => e._id)).toEqual(["a", "c"]);
    expect(result["3. Acceptable use"].map((e) => e._id)).toEqual(["b"]);
    expect(result["2. Using AI tools effectively"]).toEqual([]);
  });

  it("preserves input order within a section (the GROQ query sorts by number)", () => {
    const result = groupFaqEntriesBySection([
      entry({ _id: "first", section: "6. Copyright", number: 1 }),
      entry({ _id: "second", section: "6. Copyright", number: 2 }),
    ]);
    expect(result["6. Copyright"].map((e) => e._id)).toEqual(["first", "second"]);
  });

  it("ignores entries whose section does not match the canonical list", () => {
    const result = groupFaqEntriesBySection([
      entry({ _id: "stray", section: "Made up" as FaqSection }),
    ]);
    for (const section of FAQ_SECTIONS) {
      expect(result[section]).toEqual([]);
    }
  });
});

describe("portableTextToPlain", () => {
  it("returns an empty string for null or empty input", () => {
    expect(portableTextToPlain(null)).toBe("");
    expect(portableTextToPlain([])).toBe("");
  });

  it("concatenates span text from every block", () => {
    expect(
      portableTextToPlain([paragraph("Hello"), paragraph("world")]),
    ).toBe("Hello world");
  });
});

describe("filterFaqEntries", () => {
  const entries: FaqEntry[] = [
    entry({
      _id: "dpia",
      section: "5. Data security and privacy",
      question: "Do we need a DPIA?",
      answer: [paragraph("Yes, complete a DPIA before processing personal data.")],
    }),
    entry({
      _id: "copyright",
      section: "6. Copyright",
      question: "Who owns generated content?",
      answer: [paragraph("Crown copyright applies to outputs created at work.")],
    }),
    entry({
      _id: "no-answer",
      section: "1. Getting started",
      question: "How do I sign in?",
      answer: null,
    }),
  ];

  it("returns the input unchanged when the query is empty or whitespace", () => {
    expect(filterFaqEntries(entries, "")).toBe(entries);
    expect(filterFaqEntries(entries, "   ")).toBe(entries);
  });

  it("matches case-insensitively against the question text", () => {
    const result = filterFaqEntries(entries, "SIGN IN");
    expect(result.map((e) => e._id)).toEqual(["no-answer"]);
  });

  it("matches case-insensitively against the answer text", () => {
    const result = filterFaqEntries(entries, "crown");
    expect(result.map((e) => e._id)).toEqual(["copyright"]);
  });

  it("matches the literal acronym DPIA in either field", () => {
    const result = filterFaqEntries(entries, "dpia");
    expect(result.map((e) => e._id)).toEqual(["dpia"]);
  });

  it("returns no entries when nothing matches", () => {
    expect(filterFaqEntries(entries, "nonexistent")).toEqual([]);
  });
});
