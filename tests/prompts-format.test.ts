import { describe, expect, it } from "vitest";

import { formatCompetitionMonthLabel, formatPromptDate } from "@/lib/prompts/format";

describe("formatPromptDate", () => {
  it("returns 'Posted recently' for null/undefined/empty", () => {
    expect(formatPromptDate(null)).toBe("Posted recently");
    expect(formatPromptDate(undefined)).toBe("Posted recently");
    expect(formatPromptDate("")).toBe("Posted recently");
  });

  it("returns 'Posted recently' for an unparseable value", () => {
    expect(formatPromptDate("not-a-date")).toBe("Posted recently");
  });

  it("formats an ISO datetime as Posted dd/mm/yyyy", () => {
    expect(formatPromptDate("2026-04-30T09:15:00.000Z")).toBe("Posted 30/04/2026");
  });

  it("zero-pads single-digit days and months", () => {
    expect(formatPromptDate("2026-01-05T00:00:00Z")).toBe("Posted 05/01/2026");
  });
});

describe("formatCompetitionMonthLabel", () => {
  it("returns empty for null/undefined/malformed", () => {
    expect(formatCompetitionMonthLabel(null)).toBe("");
    expect(formatCompetitionMonthLabel(undefined)).toBe("");
    expect(formatCompetitionMonthLabel("")).toBe("");
    expect(formatCompetitionMonthLabel("2026")).toBe("");
    expect(formatCompetitionMonthLabel("not-a-month")).toBe("");
  });

  it("returns Month Year for a valid YYYY-MM", () => {
    expect(formatCompetitionMonthLabel("2026-05")).toBe("May 2026");
    expect(formatCompetitionMonthLabel("2026-01")).toBe("January 2026");
    expect(formatCompetitionMonthLabel("2026-12")).toBe("December 2026");
  });

  it("returns empty for an out-of-range month", () => {
    expect(formatCompetitionMonthLabel("2026-13")).toBe("");
    expect(formatCompetitionMonthLabel("2026-00")).toBe("");
  });
});
