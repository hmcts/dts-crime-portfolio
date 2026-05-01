import { STAGES, STAGE_LABELS, type Stage } from "@/lib/enums/stage";

import type { GalaxyLens, GalaxyProject } from "./types";

/**
 * Pure cluster-grouping for the galaxy canvas. No DOM, no React. The
 * canvas reads these clusters, then runs `d3-force` over project nodes
 * pulled toward each cluster's centroid. Spec:
 * openspec/specs/galaxy-view/spec.md.
 */

export interface GalaxyCluster {
  /** Stable key, e.g. capability id, stage value, governance bucket. */
  key: string;
  /** Display label shown in the legend and on the cluster header. */
  label: string;
  /** Hex fill colour for the cluster's swatch. */
  color: string;
  projects: GalaxyProject[];
}

const FALLBACK_KEY = "__none__";
const FALLBACK_LABEL = "Uncategorised";

const NEUTRAL_FILL = "#e5e5e5";

/**
 * Hex equivalents of `STAGE_PILL_CLASSES[stage].bg` (Tailwind classes
 * don't apply to canvas `fillStyle`). Keep these in sync with
 * `lib/enums/stage.ts` if the palette changes.
 */
export const STAGE_FILL: Record<Stage, string> = {
  idea: "#f5f5f5", // bg-neutral-100
  scan: "#fef3c7", // bg-amber-100
  pilot: "#dbeafe", // bg-blue-100
  scale: "#d1fae5", // bg-emerald-100
  stalled: "#ffedd5", // bg-orange-100
  sunset: "#e5e5e5", // bg-neutral-200
};

/**
 * Distinct pastel palette used by every non-stage lens so adjacent
 * clusters in the legend don't collide. Cycled by index — order is
 * deterministic since clusters are sorted alphabetically.
 */
const CLUSTER_PALETTE = [
  "#bae6fd", // sky-200
  "#fed7aa", // orange-200
  "#bbf7d0", // green-200
  "#fbcfe8", // pink-200
  "#ddd6fe", // violet-200
  "#fde68a", // amber-200
  "#a5f3fc", // cyan-200
  "#fecaca", // red-200
  "#bfdbfe", // blue-200
  "#d9f99d", // lime-200
];

function paletteFor(index: number, total: number): string {
  if (total <= 1) return CLUSTER_PALETTE[0];
  return CLUSTER_PALETTE[index % CLUSTER_PALETTE.length];
}

export function groupProjects(
  projects: GalaxyProject[],
  lens: GalaxyLens,
): GalaxyCluster[] {
  switch (lens) {
    case "stage":
      return groupByStage(projects);
    case "capability":
      return groupByCapability(projects);
    case "business-area":
      return groupByBusinessArea(projects);
    case "delivery-area":
      return groupByDirectorate(projects);
    case "governance":
      return groupByGovernance(projects);
  }
}

function groupByStage(projects: GalaxyProject[]): GalaxyCluster[] {
  const buckets: Record<Stage, GalaxyProject[]> = {
    idea: [],
    scan: [],
    pilot: [],
    scale: [],
    stalled: [],
    sunset: [],
  };
  for (const project of projects) {
    if (project.projectStage && project.projectStage in buckets) {
      buckets[project.projectStage].push(project);
    }
  }
  return STAGES.map((stage) => ({
    key: stage,
    label: STAGE_LABELS[stage],
    color: STAGE_FILL[stage],
    projects: buckets[stage],
  }));
}

function groupByCapability(projects: GalaxyProject[]): GalaxyCluster[] {
  const buckets = new Map<string, { label: string; projects: GalaxyProject[] }>();
  for (const project of projects) {
    const cap = project.capability;
    const key = cap?._id ?? FALLBACK_KEY;
    const label = cap?.name?.trim() || FALLBACK_LABEL;
    const existing = buckets.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      buckets.set(key, { label, projects: [project] });
    }
  }
  return finaliseSingleAssignment(buckets);
}

function groupByBusinessArea(projects: GalaxyProject[]): GalaxyCluster[] {
  // Projects with multiple business areas are placed in the alphabetically
  // first one to keep the cluster assignment 1:1 (force layout cannot
  // place a node in two centres at once). Projects with no business area
  // fall into "Uncategorised".
  const buckets = new Map<string, { label: string; projects: GalaxyProject[] }>();
  for (const project of projects) {
    const sorted = [...project.businessAreas].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const primary = sorted[0];
    const key = primary?._id ?? FALLBACK_KEY;
    const label = primary?.name?.trim() || FALLBACK_LABEL;
    const existing = buckets.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      buckets.set(key, { label, projects: [project] });
    }
  }
  return finaliseSingleAssignment(buckets);
}

function groupByDirectorate(projects: GalaxyProject[]): GalaxyCluster[] {
  const buckets = new Map<string, { label: string; projects: GalaxyProject[] }>();
  for (const project of projects) {
    const directorate = project.directorate;
    const key = directorate?._id ?? FALLBACK_KEY;
    const label = directorate?.name?.trim() || FALLBACK_LABEL;
    const existing = buckets.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      buckets.set(key, { label, projects: [project] });
    }
  }
  return finaliseSingleAssignment(buckets);
}

function groupByGovernance(projects: GalaxyProject[]): GalaxyCluster[] {
  const buckets = new Map<string, { label: string; projects: GalaxyProject[] }>();
  for (const project of projects) {
    const body = project.governanceBody?.trim();
    const key = body ? body : FALLBACK_KEY;
    const label = body ? body : FALLBACK_LABEL;
    const existing = buckets.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      buckets.set(key, { label, projects: [project] });
    }
  }
  return finaliseSingleAssignment(buckets);
}

function finaliseSingleAssignment(
  buckets: Map<string, { label: string; projects: GalaxyProject[] }>,
): GalaxyCluster[] {
  const named = Array.from(buckets.entries())
    .filter(([key]) => key !== FALLBACK_KEY)
    .sort(([, a], [, b]) => a.label.localeCompare(b.label));
  const fallback = buckets.get(FALLBACK_KEY);
  const ordered: [string, { label: string; projects: GalaxyProject[] }][] = [...named];
  if (fallback) ordered.push([FALLBACK_KEY, fallback]);
  return ordered.map(([key, { label, projects }], index) => ({
    key,
    label,
    color:
      key === FALLBACK_KEY
        ? NEUTRAL_FILL
        : paletteFor(index, ordered.length),
    projects,
  }));
}

export const GALAXY_NEUTRAL_FILL = NEUTRAL_FILL;
export const GALAXY_FALLBACK_KEY = FALLBACK_KEY;
export const GALAXY_FALLBACK_LABEL = FALLBACK_LABEL;
