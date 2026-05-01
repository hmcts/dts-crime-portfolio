import { describe, expect, it } from "vitest";

import { assuranceVerdict, formatUpdateTimestamp } from "@/lib/portfolio/dossierFormat";

describe("formatUpdateTimestamp", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(formatUpdateTimestamp(null)).toBe("");
    expect(formatUpdateTimestamp(undefined)).toBe("");
    expect(formatUpdateTimestamp("")).toBe("");
  });

  it("returns empty string for an unparseable value", () => {
    expect(formatUpdateTimestamp("not-a-date")).toBe("");
  });

  it("formats an ISO datetime as dd/mm/yyyy HH:mm", () => {
    expect(formatUpdateTimestamp("2026-04-30T09:15:00.000Z")).toBe("30/04/2026 09:15");
  });

  it("zero-pads single-digit hours and minutes", () => {
    expect(formatUpdateTimestamp("2026-01-05T03:07:00Z")).toBe("05/01/2026 03:07");
  });
});

describe("assuranceVerdict", () => {
  it("treats nullish values as missing with a friendly label", () => {
    expect(assuranceVerdict(null)).toEqual({ tone: "missing", label: "Not yet recorded" });
    expect(assuranceVerdict(undefined)).toEqual({ tone: "missing", label: "Not yet recorded" });
    expect(assuranceVerdict("")).toEqual({ tone: "missing", label: "Not yet recorded" });
  });

  it("treats complete and yes/no/not-required as ok", () => {
    expect(assuranceVerdict("complete").tone).toBe("ok");
    expect(assuranceVerdict("yes").tone).toBe("ok");
    expect(assuranceVerdict("no").tone).toBe("ok");
    expect(assuranceVerdict("not-required").tone).toBe("ok");
  });

  it("treats in-progress as warn", () => {
    expect(assuranceVerdict("in-progress").tone).toBe("warn");
  });

  it("treats missing and unknown as missing tone", () => {
    expect(assuranceVerdict("missing").tone).toBe("missing");
    expect(assuranceVerdict("unknown").tone).toBe("missing");
  });

  it("falls back to a missing tone for unrecognised values", () => {
    expect(assuranceVerdict("garbage").tone).toBe("missing");
  });
});
