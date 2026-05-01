import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  GALAXY_VIEWBOX,
  NEUTRAL_FILL,
  STAGE_FILL,
  buildLayout,
  groupProjects,
  truncateLabel,
} from "@/lib/galaxy/layout";
import type { GalaxyProject } from "@/lib/galaxy/types";

function project(overrides: Partial<GalaxyProject> & { _id: string }): GalaxyProject {
  return {
    name: overrides._id,
    projectStage: "pilot",
    capability: null,
    ...overrides,
  };
}

describe("truncateLabel", () => {
  it("returns short names unchanged", () => {
    expect(truncateLabel("Short name")).toBe("Short name");
  });

  it("truncates names longer than the limit and adds an ellipsis", () => {
    const long = "a".repeat(40);
    const out = truncateLabel(long, 20);
    expect(out.length).toBe(20);
    expect(out.endsWith("…")).toBe(true);
  });
});

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

  it("places each project in the cluster matching its stage", () => {
    const clusters = groupProjects(
      [
        project({ _id: "p1", projectStage: "pilot" }),
        project({ _id: "p2", projectStage: "scale" }),
        project({ _id: "p3", projectStage: "pilot" }),
      ],
      "stage",
    );
    const pilot = clusters.find((c) => c.key === "pilot")!;
    const scale = clusters.find((c) => c.key === "scale")!;
    expect(pilot.projects.map((p) => p._id)).toEqual(["p1", "p3"]);
    expect(scale.projects.map((p) => p._id)).toEqual(["p2"]);
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
    expect(clusters.find((c) => c.key === "scale")?.projects.map((p) => p._id)).toEqual(["p2"]);
  });
});

describe("groupProjects (capability lens)", () => {
  it("returns one cluster per distinct capability, alphabetical", () => {
    const clusters = groupProjects(
      [
        project({ _id: "p1", capability: "Voice transcription" }),
        project({ _id: "p2", capability: "Anomaly detection" }),
        project({ _id: "p3", capability: "Voice transcription" }),
      ],
      "capability",
    );
    expect(clusters.map((c) => c.key)).toEqual([
      "Anomaly detection",
      "Voice transcription",
    ]);
    expect(clusters[1].projects.map((p) => p._id)).toEqual(["p1", "p3"]);
  });

  it("places projects with no capability under an Uncategorised cluster at the end", () => {
    const clusters = groupProjects(
      [
        project({ _id: "p1", capability: null }),
        project({ _id: "p2", capability: "Voice transcription" }),
      ],
      "capability",
    );
    expect(clusters.map((c) => c.label)).toEqual(["Voice transcription", "Uncategorised"]);
    expect(clusters[1].projects.map((p) => p._id)).toEqual(["p1"]);
  });

  it("uses the neutral fill for every capability cluster", () => {
    const clusters = groupProjects(
      [project({ _id: "p1", capability: "Triage" })],
      "capability",
    );
    expect(clusters.every((c) => c.color === NEUTRAL_FILL)).toBe(true);
  });
});

describe("buildLayout", () => {
  it("uses a fixed 800x600 viewBox regardless of project count", () => {
    const layout = buildLayout([], "stage");
    expect(layout.viewBoxWidth).toBe(GALAXY_VIEWBOX.width);
    expect(layout.viewBoxHeight).toBe(GALAXY_VIEWBOX.height);
  });

  it("places stage clusters in side-by-side columns", () => {
    const layout = buildLayout([], "stage");
    expect(layout.clusters).toHaveLength(6);
    const xs = layout.clusters.map((c) => c.x);
    const sorted = [...xs].sort((a, b) => a - b);
    expect(xs).toEqual(sorted);
    // Columns should be of equal width and tile across the viewBox.
    const width = layout.clusters[0].width;
    expect(width * layout.clusters.length).toBeCloseTo(layout.viewBoxWidth, 5);
  });

  it("positions every project inside its cluster's bounding box", () => {
    const layout = buildLayout(
      [
        project({ _id: "p1", projectStage: "pilot" }),
        project({ _id: "p2", projectStage: "pilot" }),
      ],
      "stage",
    );
    const pilot = layout.clusters.find((c) => c.key === "pilot")!;
    expect(pilot.positioned).toHaveLength(2);
    for (const placement of pilot.positioned) {
      expect(placement.cx).toBeGreaterThanOrEqual(pilot.x - 1);
      expect(placement.cx).toBeLessThanOrEqual(pilot.x + pilot.width + 1);
      expect(placement.cy).toBeGreaterThanOrEqual(0);
      expect(placement.cy).toBeLessThanOrEqual(layout.viewBoxHeight);
    }
  });

  it("stacks projects vertically within a stage column", () => {
    const layout = buildLayout(
      [
        project({ _id: "p1", projectStage: "pilot" }),
        project({ _id: "p2", projectStage: "pilot" }),
        project({ _id: "p3", projectStage: "pilot" }),
      ],
      "stage",
    );
    const pilot = layout.clusters.find((c) => c.key === "pilot")!;
    const ys = pilot.positioned.map((p) => p.cy);
    expect(ys[1]).toBeGreaterThan(ys[0]);
    expect(ys[2]).toBeGreaterThan(ys[1]);
  });

  it("places capability clusters in stacked rows", () => {
    const layout = buildLayout(
      [
        project({ _id: "p1", capability: "Anomaly detection" }),
        project({ _id: "p2", capability: "Voice transcription" }),
      ],
      "capability",
    );
    expect(layout.clusters).toHaveLength(2);
    const ys = layout.clusters.map((c) => c.y);
    const sorted = [...ys].sort((a, b) => a - b);
    expect(ys).toEqual(sorted);
    // Rows should tile vertically across the viewBox.
    const height = layout.clusters[0].height;
    expect(height * layout.clusters.length).toBeCloseTo(layout.viewBoxHeight, 5);
  });

  it("lays out capability projects horizontally within a row", () => {
    const layout = buildLayout(
      [
        project({ _id: "p1", capability: "Triage" }),
        project({ _id: "p2", capability: "Triage" }),
        project({ _id: "p3", capability: "Triage" }),
      ],
      "capability",
    );
    const triage = layout.clusters.find((c) => c.key === "Triage")!;
    const xs = triage.positioned.map((p) => p.cx);
    expect(xs[1]).toBeGreaterThan(xs[0]);
    expect(xs[2]).toBeGreaterThan(xs[1]);
  });
});
