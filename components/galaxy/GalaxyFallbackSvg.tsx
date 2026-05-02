import Link from "next/link";

import type { GalaxyCluster } from "@/lib/galaxy/lenses";
import { activeOverlaysForProject } from "@/lib/galaxy/signals";
import { STAR_RADIUS, type SimulationOutput } from "@/lib/galaxy/simulation";
import {
  GALAXY_OVERLAY_COLORS,
  type GalaxyOverlay,
  type GalaxyProject,
} from "@/lib/galaxy/types";

/**
 * Static SVG fallback rendered when canvas is unavailable. Reuses the
 * same force-directed positions and overlay rings so the visual
 * grammar is consistent. Each star is a `<Link>` so click-through to
 * the dossier still works without JS interactivity. Spec:
 * openspec/specs/galaxy-view/spec.md (Static-SVG fallback).
 */
export function GalaxyFallbackSvg({
  projects,
  clusters,
  layout,
  overlays,
}: {
  projects: GalaxyProject[];
  clusters: GalaxyCluster[];
  layout: SimulationOutput;
  overlays: GalaxyOverlay[];
}) {
  const projectById = new Map(projects.map((p) => [p._id, p]));
  const colorByCluster = new Map(clusters.map((c) => [c.key, c.color]));
  const overlaysActive = overlays.length > 0;

  return (
    <div className="bg-neutral-950 p-3">
      <svg
        role="img"
        aria-label="Galaxy view (static fallback) of all projects grouped by the active lens"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width="100%"
        height="auto"
        className="block"
      >
        {clusters
          .filter((c) => c.projects.length > 0)
          .map((cluster) => {
            const centre = layout.clusters.find((c) => c.id === cluster.key);
            if (!centre) return null;
            return (
              <text
                key={`label-${cluster.key}`}
                x={centre.x}
                y={centre.y - centre.radius - 10}
                textAnchor="middle"
                fontSize="14"
                fill="#cbd5f5"
                fontWeight="600"
              >
                {cluster.label}
              </text>
            );
          })}
        {layout.stars.map((node) => {
          const project = projectById.get(node.id);
          if (!project) return null;
          const fill = colorByCluster.get(node.clusterId) ?? "#94a3b8";
          const rings = activeOverlaysForProject(project, overlays);
          const dimmed = overlaysActive && rings.length === 0;
          return (
            <Link
              key={node.id}
              href={`/portfolio/${project._id}`}
              aria-label={`Open ${project.name} dossier`}
            >
              <g opacity={dimmed ? 0.25 : 1}>
                <title>{project.name}</title>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={STAR_RADIUS}
                  fill={fill}
                  stroke="#0f172a"
                  strokeWidth={1}
                />
                {rings.map((overlay, index) => (
                  <circle
                    key={overlay}
                    cx={node.x}
                    cy={node.y}
                    r={STAR_RADIUS + 3 + index * 3}
                    fill="none"
                    stroke={GALAXY_OVERLAY_COLORS[overlay]}
                    strokeWidth={2}
                  />
                ))}
              </g>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}
