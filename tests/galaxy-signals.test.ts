import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  activeOverlaysForProject,
  hasComplianceGap,
  hasNoUpdateFor,
  projectMatchesOverlay,
  wasUpdatedWithin,
} from "@/lib/galaxy/signals";
import type { GalaxyProject } from "@/lib/galaxy/types";

function project(overrides: Partial<GalaxyProject> & { _id: string }): GalaxyProject {
  return {
    name: overrides._id,
    projectStage: "pilot",
    capability: null,
    businessAreas: [],
    directorate: null,
    governanceBody: null,
    riskRegister: "yes",
    dpiaInPlace: "complete",
    lastUpdatedAt: null,
    ...overrides,
  };
}

const NOW = new Date("2026-05-01T00:00:00Z");

describe("hasComplianceGap", () => {
  it("flags projects with a missing risk register", () => {
    expect(hasComplianceGap(project({ _id: "p1", riskRegister: null }))).toBe(true);
    expect(hasComplianceGap(project({ _id: "p1", riskRegister: "no" }))).toBe(true);
    expect(hasComplianceGap(project({ _id: "p1", riskRegister: "unknown" }))).toBe(true);
  });

  it("flags projects with a missing or absent DPIA", () => {
    expect(hasComplianceGap(project({ _id: "p1", dpiaInPlace: null }))).toBe(true);
    expect(hasComplianceGap(project({ _id: "p1", dpiaInPlace: "missing" }))).toBe(true);
  });

  it("does not flag projects with both items in place", () => {
    expect(
      hasComplianceGap(
        project({ _id: "p1", riskRegister: "yes", dpiaInPlace: "complete" }),
      ),
    ).toBe(false);
    expect(
      hasComplianceGap(
        project({ _id: "p1", riskRegister: "yes", dpiaInPlace: "in-progress" }),
      ),
    ).toBe(false);
  });
});

describe("wasUpdatedWithin", () => {
  it("returns true when the project was updated inside the window", () => {
    const recent = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      wasUpdatedWithin(project({ _id: "p1", lastUpdatedAt: recent }), 7, NOW),
    ).toBe(true);
  });

  it("returns false when the project was updated before the window", () => {
    const old = new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      wasUpdatedWithin(project({ _id: "p1", lastUpdatedAt: old }), 7, NOW),
    ).toBe(false);
  });

  it("returns false when there is no update timestamp", () => {
    expect(
      wasUpdatedWithin(project({ _id: "p1", lastUpdatedAt: null }), 7, NOW),
    ).toBe(false);
  });
});

describe("hasNoUpdateFor", () => {
  it("returns true when the gap exceeds the window", () => {
    const old = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(hasNoUpdateFor(project({ _id: "p1", lastUpdatedAt: old }), 30, NOW)).toBe(true);
  });

  it("returns false when the project was updated inside the window", () => {
    const recent = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      hasNoUpdateFor(project({ _id: "p1", lastUpdatedAt: recent }), 30, NOW),
    ).toBe(false);
  });

  it("treats projects with no timestamp as stale", () => {
    expect(
      hasNoUpdateFor(project({ _id: "p1", lastUpdatedAt: null }), 30, NOW),
    ).toBe(true);
  });
});

describe("projectMatchesOverlay", () => {
  it("dispatches to the right predicate for each overlay", () => {
    const fresh = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const stale = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const flagged = project({
      _id: "p1",
      riskRegister: "no",
      lastUpdatedAt: fresh,
    });
    const old = project({ _id: "p2", lastUpdatedAt: stale });
    expect(projectMatchesOverlay(flagged, "compliance-gaps", NOW)).toBe(true);
    expect(projectMatchesOverlay(flagged, "updated-7d", NOW)).toBe(true);
    expect(projectMatchesOverlay(old, "no-update-30d", NOW)).toBe(true);
    expect(projectMatchesOverlay(old, "updated-7d", NOW)).toBe(false);
  });
});

describe("activeOverlaysForProject", () => {
  it("returns every overlay that matches in canonical order", () => {
    const fresh = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const subject = project({
      _id: "p1",
      riskRegister: "no",
      dpiaInPlace: "missing",
      lastUpdatedAt: fresh,
    });
    expect(
      activeOverlaysForProject(subject, ["compliance-gaps", "updated-7d"], NOW),
    ).toEqual(["compliance-gaps", "updated-7d"]);
  });
});
