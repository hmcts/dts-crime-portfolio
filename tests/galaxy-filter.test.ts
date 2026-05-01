import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { filterGalaxyProjects } from "@/lib/galaxy/filter";
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

const EMPTY = {
  search: "",
  stages: [] as never,
  capabilityIds: [] as never,
  businessAreaIds: [] as never,
  directorateIds: [] as never,
} as const;

describe("filterGalaxyProjects", () => {
  it("returns every project when no filters are active", () => {
    const projects = [project({ _id: "p1" }), project({ _id: "p2" })];
    expect(filterGalaxyProjects(projects, EMPTY).map((p) => p._id)).toEqual([
      "p1",
      "p2",
    ]);
  });

  it("filters by case-insensitive name search", () => {
    const projects = [
      project({ _id: "p1", name: "Voice triage" }),
      project({ _id: "p2", name: "Anomaly detection" }),
    ];
    const out = filterGalaxyProjects(projects, { ...EMPTY, search: "voice" });
    expect(out.map((p) => p._id)).toEqual(["p1"]);
  });

  it("filters by stage", () => {
    const projects = [
      project({ _id: "p1", projectStage: "pilot" }),
      project({ _id: "p2", projectStage: "scale" }),
    ];
    const out = filterGalaxyProjects(projects, { ...EMPTY, stages: ["scale"] });
    expect(out.map((p) => p._id)).toEqual(["p2"]);
  });

  it("filters by capability id", () => {
    const projects = [
      project({ _id: "p1", capability: { _id: "voice", name: "Voice" } }),
      project({ _id: "p2", capability: { _id: "anomaly", name: "Anomaly" } }),
    ];
    const out = filterGalaxyProjects(projects, {
      ...EMPTY,
      capabilityIds: ["anomaly"],
    });
    expect(out.map((p) => p._id)).toEqual(["p2"]);
  });

  it("matches when any business area is in the filter set", () => {
    const projects = [
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
    ];
    const out = filterGalaxyProjects(projects, {
      ...EMPTY,
      businessAreaIds: ["hmpps"],
    });
    expect(out.map((p) => p._id)).toEqual(["p1"]);
  });

  it("filters by directorate id", () => {
    const projects = [
      project({ _id: "p1", directorate: { _id: "data", name: "Data" } }),
      project({ _id: "p2", directorate: { _id: "digital", name: "Digital" } }),
    ];
    const out = filterGalaxyProjects(projects, {
      ...EMPTY,
      directorateIds: ["data"],
    });
    expect(out.map((p) => p._id)).toEqual(["p1"]);
  });

  it("combines filters with AND semantics", () => {
    const projects = [
      project({
        _id: "p1",
        projectStage: "pilot",
        capability: { _id: "voice", name: "Voice" },
      }),
      project({
        _id: "p2",
        projectStage: "scale",
        capability: { _id: "voice", name: "Voice" },
      }),
    ];
    const out = filterGalaxyProjects(projects, {
      ...EMPTY,
      stages: ["pilot"],
      capabilityIds: ["voice"],
    });
    expect(out.map((p) => p._id)).toEqual(["p1"]);
  });
});
