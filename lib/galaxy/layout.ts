import { STAGES, STAGE_LABELS, type Stage } from "@/lib/enums/stage";
import type { GalaxyLens, GalaxyProject } from "./types";

/**
 * Pure layout maths for the v0 SVG galaxy. No DOM, no React — just
 * grouping and positioning. The full canvas/WebGL implementation
 * (force-directed layout, camera, overlays) is deferred. Spec:
 * openspec/specs/galaxy-view/spec.md.
 */

export interface GalaxyCluster {
  /** Stable key, e.g. stage value or capability name slug */
  key: string;
  /** Display label, e.g. "Pilot" or "Voice transcription" */
  label: string;
  /** Hex fill colour for the cluster swatch and circles */
  color: string;
  projects: GalaxyProject[];
}

export interface PositionedProject {
  project: GalaxyProject;
  cx: number;
  cy: number;
  /** Where to anchor the label text relative to (cx, cy). */
  labelX: number;
  labelY: number;
}

export interface PositionedCluster extends GalaxyCluster {
  /** Bounding box of the cluster in viewBox units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Anchor for the cluster label. */
  labelX: number;
  labelY: number;
  positioned: PositionedProject[];
}

export interface GalaxyLayout {
  viewBoxWidth: number;
  viewBoxHeight: number;
  clusters: PositionedCluster[];
}

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 600;
const CIRCLE_RADIUS = 10;
const CAPABILITY_FALLBACK_KEY = "__none__";
const CAPABILITY_FALLBACK_LABEL = "Uncategorised";

/**
 * Hex equivalents of `STAGE_PILL_CLASSES[stage].bg` (Tailwind classes
 * don't apply to SVG `fill`). Keep these in sync with
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

/** Neutral fill used for the capability lens. */
export const NEUTRAL_FILL = "#f5f5f5";

/** Truncates a project name for the inline SVG label. */
export function truncateLabel(name: string, max = 20): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Group projects into clusters by the chosen lens.
 *
 * - `stage`: one cluster per Stage in canonical order. Projects with a
 *   missing/unknown stage are dropped (the schema marks projectStage
 *   required, but we defend against partial data).
 * - `capability`: one cluster per distinct capability name, alphabetical.
 *   Projects with no capability go into a single "Uncategorised" cluster
 *   at the end so they remain visible.
 */
export function groupProjects(projects: GalaxyProject[], lens: GalaxyLens): GalaxyCluster[] {
  if (lens === "stage") {
    return groupByStage(projects);
  }
  return groupByCapability(projects);
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
    const label = project.capability?.trim() || CAPABILITY_FALLBACK_LABEL;
    const key = project.capability?.trim() ? label : CAPABILITY_FALLBACK_KEY;
    const existing = buckets.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      buckets.set(key, { label, projects: [project] });
    }
  }
  const named = Array.from(buckets.entries())
    .filter(([key]) => key !== CAPABILITY_FALLBACK_KEY)
    .sort(([a], [b]) => a.localeCompare(b));
  const fallback = buckets.get(CAPABILITY_FALLBACK_KEY);
  const ordered = [...named];
  if (fallback) ordered.push([CAPABILITY_FALLBACK_KEY, fallback]);
  return ordered.map(([key, { label, projects: clusterProjects }]) => ({
    key,
    label,
    color: NEUTRAL_FILL,
    projects: clusterProjects,
  }));
}

/**
 * Compute (cx, cy) for each project given the chosen lens. Stage lens
 * uses one column per stage, projects wrap vertically. Capability lens
 * uses one row per capability, projects wrap horizontally. Both share a
 * fixed viewBox so callers don't need to know about coordinate space.
 */
export function buildLayout(projects: GalaxyProject[], lens: GalaxyLens): GalaxyLayout {
  const clusters = groupProjects(projects, lens);
  if (lens === "stage") {
    return {
      viewBoxWidth: VIEWBOX_WIDTH,
      viewBoxHeight: VIEWBOX_HEIGHT,
      clusters: layoutColumns(clusters),
    };
  }
  return {
    viewBoxWidth: VIEWBOX_WIDTH,
    viewBoxHeight: VIEWBOX_HEIGHT,
    clusters: layoutRows(clusters),
  };
}

function layoutColumns(clusters: GalaxyCluster[]): PositionedCluster[] {
  const columnCount = Math.max(clusters.length, 1);
  const columnWidth = VIEWBOX_WIDTH / columnCount;
  const headerHeight = 48;
  const padding = 12;
  const rowSpacing = 32;

  return clusters.map((cluster, index) => {
    const x = index * columnWidth;
    const innerX = x + columnWidth / 2;
    const innerTop = headerHeight + padding;
    const innerHeight = VIEWBOX_HEIGHT - innerTop - padding;
    const maxRows = Math.max(Math.floor(innerHeight / rowSpacing), 1);
    const positioned: PositionedProject[] = cluster.projects.map((project, i) => {
      const row = i % maxRows;
      const overflowCol = Math.floor(i / maxRows);
      const offsetX = overflowCol === 0 ? 0 : ((overflowCol % 2 === 1 ? 1 : -1) * (CIRCLE_RADIUS + 6) * Math.ceil(overflowCol / 2));
      const cx = innerX + offsetX;
      const cy = innerTop + row * rowSpacing + CIRCLE_RADIUS + 4;
      return {
        project,
        cx,
        cy,
        labelX: cx + CIRCLE_RADIUS + 4,
        labelY: cy + 4,
      };
    });
    return {
      ...cluster,
      x,
      y: 0,
      width: columnWidth,
      height: VIEWBOX_HEIGHT,
      labelX: innerX,
      labelY: 24,
      positioned,
    };
  });
}

function layoutRows(clusters: GalaxyCluster[]): PositionedCluster[] {
  const rowCount = Math.max(clusters.length, 1);
  const rowHeight = VIEWBOX_HEIGHT / rowCount;
  const labelWidth = 160;
  const padding = 12;
  const colSpacing = 36;

  return clusters.map((cluster, index) => {
    const y = index * rowHeight;
    const innerY = y + rowHeight / 2;
    const innerLeft = labelWidth + padding;
    const innerWidth = VIEWBOX_WIDTH - innerLeft - padding;
    const maxCols = Math.max(Math.floor(innerWidth / colSpacing), 1);
    const positioned: PositionedProject[] = cluster.projects.map((project, i) => {
      const col = i % maxCols;
      const overflowRow = Math.floor(i / maxCols);
      const offsetY = overflowRow === 0 ? 0 : ((overflowRow % 2 === 1 ? 1 : -1) * (CIRCLE_RADIUS + 6) * Math.ceil(overflowRow / 2));
      const cx = innerLeft + col * colSpacing + CIRCLE_RADIUS + 4;
      const cy = innerY + offsetY;
      return {
        project,
        cx,
        cy,
        labelX: cx + CIRCLE_RADIUS + 4,
        labelY: cy + 4,
      };
    });
    return {
      ...cluster,
      x: 0,
      y,
      width: VIEWBOX_WIDTH,
      height: rowHeight,
      labelX: padding,
      labelY: innerY + 4,
      positioned,
    };
  });
}

export const GALAXY_VIEWBOX = { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT } as const;
export const GALAXY_CIRCLE_RADIUS = CIRCLE_RADIUS;
