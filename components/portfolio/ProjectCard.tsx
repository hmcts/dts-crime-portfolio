import Link from "next/link";

import { StagePill } from "@/components/portfolio/StagePill";
import { formatLastUpdatedFooter, truncateDescription } from "@/lib/portfolio/format";
import type { PortfolioListItem } from "@/lib/portfolio/types";

/**
 * Portfolio card. Spec: openspec/specs/portfolio-management/spec.md
 * (Default view). The whole card is the link target so it's keyboard
 * focusable; clicking deep-links to /portfolio/[id].
 */
export function ProjectCard({ project }: { project: PortfolioListItem }) {
  const breadcrumb = [project.group, project.directorate].filter(Boolean).join(" · ");
  const businessArea = project.businessAreas?.[0];
  const additionalAreas = (project.businessAreas?.length ?? 0) - 1;

  return (
    <Link
      href={`/portfolio/${project._id}`}
      className="block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {breadcrumb && (
        <p className="text-xs uppercase tracking-wide text-neutral-500">{breadcrumb}</p>
      )}
      <div className="mt-1 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">{project.name}</h2>
        <StagePill stage={project.projectStage} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        {truncateDescription(project.description)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        {project.capability && (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">
            {project.capability}
          </span>
        )}
        {businessArea && (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">
            {businessArea}
            {additionalAreas > 0 && <span className="ml-1 text-neutral-500">+{additionalAreas}</span>}
          </span>
        )}
        {project.linkedActionsCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">
            {project.linkedActionsCount} linked action
            {project.linkedActionsCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        <span>{project.deliveryOwner?.name ?? "No delivery owner"}</span>
        <span>{formatLastUpdatedFooter(project.lastUpdatedAt)}</span>
      </div>
    </Link>
  );
}
