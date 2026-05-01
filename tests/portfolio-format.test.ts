import { describe, expect, it } from "vitest";

import { formatLastUpdatedFooter, truncateDescription } from "@/lib/portfolio/format";

describe("formatLastUpdatedFooter", () => {
  it("returns 'No updates yet' for null/undefined/empty input", () => {
    expect(formatLastUpdatedFooter(null)).toBe("No updates yet");
    expect(formatLastUpdatedFooter(undefined)).toBe("No updates yet");
    expect(formatLastUpdatedFooter("")).toBe("No updates yet");
  });

  it("returns 'No updates yet' for an unparseable value", () => {
    expect(formatLastUpdatedFooter("not-a-date")).toBe("No updates yet");
  });

  it("formats an ISO datetime as Last updated dd/mm/yyyy", () => {
    expect(formatLastUpdatedFooter("2026-04-30T09:15:00.000Z")).toBe("Last updated 30/04/2026");
  });

  it("zero-pads single-digit days and months", () => {
    expect(formatLastUpdatedFooter("2026-01-05T00:00:00Z")).toBe("Last updated 05/01/2026");
  });
});

describe("truncateDescription", () => {
  it("returns empty string for null/undefined", () => {
    expect(truncateDescription(null)).toBe("");
    expect(truncateDescription(undefined)).toBe("");
  });

  it("returns the input when shorter than max", () => {
    expect(truncateDescription("short")).toBe("short");
  });

  it("trims surrounding whitespace", () => {
    expect(truncateDescription("  hello  ")).toBe("hello");
  });

  it("truncates and adds ellipsis when longer than max", () => {
    const long = "a".repeat(200);
    const out = truncateDescription(long, 50);
    expect(out.length).toBe(50);
    expect(out.endsWith("…")).toBe(true);
  });
});
