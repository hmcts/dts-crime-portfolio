import { describe, expect, it } from "vitest";

import {
  filterFutureEvents,
  formatEventDateTime,
  formatEventTimeRange,
} from "@/lib/events/format";

describe("formatEventDateTime", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(formatEventDateTime(null)).toBe("");
    expect(formatEventDateTime(undefined)).toBe("");
    expect(formatEventDateTime("")).toBe("");
  });

  it("returns empty string for an unparseable value", () => {
    expect(formatEventDateTime("not-a-date")).toBe("");
  });

  it("formats an ISO datetime as dd/mm/yyyy HH:mm in UTC", () => {
    expect(formatEventDateTime("2026-04-30T09:15:00.000Z")).toBe("30/04/2026 09:15");
  });

  it("zero-pads single-digit days, months, hours, and minutes", () => {
    expect(formatEventDateTime("2026-01-05T03:07:00Z")).toBe("05/01/2026 03:07");
  });

  it("renders midnight as 00:00", () => {
    expect(formatEventDateTime("2026-12-31T00:00:00Z")).toBe("31/12/2026 00:00");
  });
});

describe("formatEventTimeRange", () => {
  it("joins start and end with an en-dash", () => {
    expect(
      formatEventTimeRange("2026-04-30T09:15:00Z", "2026-04-30T10:30:00Z"),
    ).toBe("30/04/2026 09:15 – 30/04/2026 10:30");
  });

  it("returns just the start when end is missing", () => {
    expect(formatEventTimeRange("2026-04-30T09:15:00Z", null)).toBe("30/04/2026 09:15");
  });

  it("returns just the end when start is missing", () => {
    expect(formatEventTimeRange(undefined, "2026-04-30T10:30:00Z")).toBe(
      "30/04/2026 10:30",
    );
  });

  it("returns empty string when both are missing", () => {
    expect(formatEventTimeRange(null, undefined)).toBe("");
  });
});

describe("filterFutureEvents", () => {
  const now = new Date("2026-05-01T12:00:00Z");

  it("excludes events whose endsAt is before now", () => {
    const result = filterFutureEvents(
      [
        { _id: "a", endsAt: "2026-04-30T11:00:00Z" },
        { _id: "b", endsAt: "2026-05-02T11:00:00Z" },
      ],
      now,
    );
    expect(result.map((e) => e._id)).toEqual(["b"]);
  });

  it("excludes events with no endsAt or an unparseable endsAt", () => {
    const result = filterFutureEvents(
      [
        { _id: "a", endsAt: null },
        { _id: "b", endsAt: "" },
        { _id: "c", endsAt: "not-a-date" },
        { _id: "d", endsAt: "2026-06-01T10:00:00Z" },
      ],
      now,
    );
    expect(result.map((e) => e._id)).toEqual(["d"]);
  });

  it("excludes events ending exactly at now (strictly future)", () => {
    const result = filterFutureEvents(
      [{ _id: "a", endsAt: now.toISOString() }],
      now,
    );
    expect(result).toEqual([]);
  });
});
