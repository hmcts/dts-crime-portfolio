import Link from "next/link";

import { StagePill } from "@/components/portfolio/StagePill";
import { StatusPill } from "@/components/actionPlan/StatusPill";
import { ProgressSummarySection } from "@/components/actionPlan/ProgressSummarySection";
import type { ActionDetail, ActionLinkedProject } from "@/lib/actionPlan/types";
import { STRAND_DISPLAY } from "@/lib/actionPlan/types";

interface ActionDetailProps {
  action: ActionDetail;
  linkedProjects: ActionLinkedProject[];
  isAdmin?: boolean;
}

export function ActionDetailPane({
  action,
  linkedProjects,
  isAdmin = false,
}: ActionDetailProps) {
  return (
    <article className="space-y-6">
      <header className="space-y-3 border-b border-neutral-200 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          {STRAND_DISPLAY[action.strand]}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            <span className="text-neutral-500">{action.actionNo}</span> {action.name}
          </h2>
          <StatusPill status={action.progressStatus} />
        </div>
        {action.priority && (
          <p className="text-xs text-neutral-500">Priority: {action.priority}</p>
        )}
        {action.publishedStrategyUrl && (
          <a
            href={action.publishedStrategyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs font-medium text-blue-700 underline underline-offset-2"
          >
            View in published strategy ↗
          </a>
        )}
      </header>

      {action.description && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Description
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-800">{action.description}</p>
        </section>
      )}

      <ProgressSummarySection
        actionNo={action.actionNo}
        progressStatus={action.progressStatus}
        summaryOfProgress={action.summaryOfProgress}
        isAdmin={isAdmin}
      />

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Linked projects ({linkedProjects.length})
        </h3>
        {linkedProjects.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No projects link to this action yet.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {linkedProjects.map((project) => (
              <li key={project._id}>
                <Link
                  href={`/portfolio/${project._id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <StagePill stage={project.projectStage} />
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
