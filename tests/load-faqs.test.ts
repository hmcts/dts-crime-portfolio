import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadFaqEntries } from "@/lib/help/load-faqs";
import { FAQ_SECTIONS } from "@/lib/help/sections";

describe("loadFaqEntries", () => {
  const entries = loadFaqEntries();

  it("loads every .md file in content/faqs/", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("assigns each entry a stable id prefixed faq-", () => {
    for (const entry of entries) {
      expect(entry._id).toMatch(/^faq-/);
    }
  });

  it("only uses sections defined in FAQ_SECTIONS", () => {
    const allowed = new Set<string>(FAQ_SECTIONS);
    for (const entry of entries) {
      expect(allowed.has(entry.section)).toBe(true);
    }
  });

  it("sorts entries by section then number", () => {
    const sectionIndex = (s: string) => FAQ_SECTIONS.indexOf(s as never);
    for (let i = 1; i < entries.length; i += 1) {
      const a = entries[i - 1];
      const b = entries[i];
      const sectionDiff = sectionIndex(a.section) - sectionIndex(b.section);
      if (sectionDiff === 0) {
        expect(b.number).toBeGreaterThan(a.number);
      } else {
        expect(sectionDiff).toBeLessThan(0);
      }
    }
  });

  it("converts the markdown body into Portable Text blocks (paragraphs)", () => {
    const withAnswer = entries.find((e) => e.answer && e.answer.length > 0);
    expect(withAnswer).toBeDefined();
    expect(withAnswer!.answer![0]._type).toBe("block");
  });
});
