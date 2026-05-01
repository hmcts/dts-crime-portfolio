import Link from "next/link";

import {
  GALAXY_CIRCLE_RADIUS,
  truncateLabel,
  type GalaxyLayout,
} from "@/lib/galaxy/layout";

/**
 * Static SVG rendering of the v0 galaxy. Each project is a circle with a
 * label, wrapped in a `<Link>` to the dossier. Cluster headers carry a
 * colour swatch (stage lens) or a neutral swatch (capability lens). The
 * full canvas/WebGL view with force-directed layout, signal overlays,
 * and camera controls is deferred — see openspec/specs/galaxy-view/spec.md.
 */
export function GalaxySvg({ layout }: { layout: GalaxyLayout }) {
  return (
    <svg
      role="img"
      aria-label="Galaxy view of all projects grouped by the active lens"
      viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
      width="100%"
      height="auto"
      className="rounded-lg border border-neutral-200 bg-white"
    >
      {layout.clusters.map((cluster) => (
        <g key={cluster.key} data-cluster={cluster.key}>
          <rect
            x={cluster.x}
            y={cluster.y}
            width={cluster.width}
            height={cluster.height}
            fill="transparent"
            stroke="#e5e5e5"
            strokeDasharray="2 4"
          />
          <text
            x={cluster.labelX}
            y={cluster.labelY}
            textAnchor="middle"
            className="fill-neutral-800"
            fontSize="13"
            fontWeight="600"
          >
            {cluster.label}
          </text>
          <text
            x={cluster.labelX}
            y={cluster.labelY + 14}
            textAnchor="middle"
            className="fill-neutral-500"
            fontSize="10"
          >
            {cluster.projects.length} project
            {cluster.projects.length === 1 ? "" : "s"}
          </text>
          {cluster.positioned.map(({ project, cx, cy, labelX, labelY }) => (
            <Link
              key={project._id}
              href={`/portfolio/${project._id}`}
              className="focus:outline-none"
            >
              <g>
                <title>{project.name}</title>
                <circle
                  cx={cx}
                  cy={cy}
                  r={GALAXY_CIRCLE_RADIUS}
                  fill={cluster.color}
                  stroke="#525252"
                  strokeWidth="1"
                />
                <text x={labelX} y={labelY} fontSize="10" className="fill-neutral-700">
                  {truncateLabel(project.name)}
                </text>
              </g>
            </Link>
          ))}
        </g>
      ))}
    </svg>
  );
}
