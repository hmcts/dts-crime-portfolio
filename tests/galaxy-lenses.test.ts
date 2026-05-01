import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  GALAXY_FALLBACK_KEY,
  GALAXY_FALLBACK_LABEL,
  STAGE_FILL,
  groupProjects,
} from "@/lib/galaxy/lenses";
import type { GalaxyProject } from "@/lib/galaxy/types";

function project(overrides: Partial<GalaxyProject> & { _id: string }): GalaxyProject {
  return {
    name: overrides._id,
    projectStage: "pilot",
    capability: null,
    businessAreas: [],
    directorate: null,
    governanceBody: null,
    riskRegister: null,
    dpiaInPlace: null,
    lastUpdatedAt: null,
    ...overrides,
  };
}

describe("groupProjects (stage lens)", () => {
  it("returns one cluster per stage in canonical order, even when empty", () => {
    const clusters = groupProjects([], "stage");
    expect(clusters.map((c) => c.key)).toEqual([
      "idea",
      "scan",
      "pilot",
      "scale",
      "stalled",
      "sunset",
    ]);
    expect(clusters.every((c) => c.projects.length === 0)).toBe(true);
  });

  it("uses the stage hex palette for the cluster colour", () => {
    const clusters = groupProjects([], "stage");
    expect(clusters.find((c) => c.key === "pilot")?.color).toBe(STAGE_FILL.pilot);
    expect(clusters.find((c) => c.key === "idea")?.color).toBe(STAGE_FILL.idea);
  });

  it("drops projects whose stage is missing or unknown", () => {
    const clusters = groupProjects(
      [
        project({ _id: "p1", projectStage: null }),
        project({ _id: "p2", projectStage: "scale" }),
      ],
      "stage",
    );
    const total = clusters.reduce((acc, c) => acc + c.projects.length, 0);
    expect(total).toBe(1);
    expect(clusters.find((c) => c.key === "scale")?.projects.map((p) => p._id)).toEqual([
      "p2",
    ]);
  });
});

describe("groupProjects (capability lens)", () => {
  it("returns one cluster per distinct capability id, alphabetical by label", () => {
    const clusters = groupProjects(
      [
        project({ _id: "p1", capability: { _id: "voice", name: "Voice transcription" } }),
        project({ _id: "p2", capability: { _id: "anomaly", name: "Anomaly detection" } }),
        project({ _id: "p3", capability: { _id: "voice", name: "Voice transcription" } }),
      ],
      "capability",
    );
    expect(clusters.map((c) => c.label)).toEqual([
      "Anomaly detection",
      "Voice transcription",
    ]);
    expect(clusters[1].projects.map((p) => p._id)).toEqual(["p1", "p3"]);
  });

  it("places projects with no capability under an Uncategorised cluster at the end", () => {
    const clusters = groupProjects(
      [
        project({ _id: "p1", capability: null }),
        project({ _id: "p2", capability: { _id: "voice", name: "Voice transcription" } }),
      ],
      "capability",
    );
    const labels = clusters.map((c) => c.label);
    expect(labels).toEqual(["Voice transcription", GALAXY_FALLBACK_LABEL]);
    const fallback = clusters.find((c) => c.key === GALAXY_FALLBACK_KEY);
    expect(fallback?.projects.map((p) => p._id)).toEqual(["p1"]);
  });
});

describe("groupProjects (business-area lens)", () => {
  it("groups by alphabetically-first business area when a project has many", () => {
    const clusters = groupProjects(
      [
        project({
          _id: "p1",
          businessAreas: [
            { _id: "hmcts", name: "HMCTS" },
            { _id: "hmpps", name: "HMPPS" },
          ],
        }),
        project({
          _id: "p2",
          businessAreas: [{ _id: "laa", name: "LAA" }],
        }),
      ],
      "business-area",
    );
    expect(clusters.map((c) => c.label)).toEqual(["HMCTS", "LAA"]);
    expect(clusters[0].projects.map((p) => p._id)).toEqual(["p1"]);
  });

  it("falls back to Uncategorised when a project has no business area", () => {
    const clusters = groupProjects(
      [project({ _id: "p1", businessAreas: [] })],
      "business-area",
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].key).toBe(GALAXY_FALLBACK_KEY);
  });
});

describe("groupProjects (delivery-area lens)", () => {
  it("groups by directorate id and sorts alphabetically by name", () => {
    const clusters = groupProjects(
      [
        project({ _id: "p1", directorate: { _id: "data", name: "Data" } }),
        project({ _id: "p2", directorate: { _id: "digital", name: "Digital" } }),
        project({ _id: "p3", directorate: { _id: "data", name: "Data" } }),
      ],
      "delivery-area",
    );
    expect(clusters.map((c) => c.label)).toEqual(["Data", "Digital"]);
    expect(clusters[0].projects.map((p) => p._id)).toEqual(["p1", "p3"]);
  });
});

describe("groupProjects (governance lens)", () => {
  it("groups by governance body string, with an Uncategorised bucket", () => {
    const clusters = groupProjects(
      [
        project({ _id: "p1", governanceBody: "EM Delivery Board" }),
        project({ _id: "p2", governanceBody: "EM Delivery Board" }),
        project({ _id: "p3", governanceBody: null }),
      ],
      "governance",
    );
    expect(clusters.map((c) => c.label)).toEqual([
      "EM Delivery Board",
      GALAXY_FALLBACK_LABEL,
    ]);
  });
});
