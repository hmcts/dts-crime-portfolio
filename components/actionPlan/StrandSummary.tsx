import {
  PROGRESS_STATUSES,
  PROGRESS_STATUS_PILL_CLASSES,
} from "@/lib/enums/progress-status";

import { STRAND_DISPLAY, type StrandSummary } from "@/lib/actionPlan/types";

interface StrandSummaryProps {
  summaries: StrandSummary[];
}

export function StrandSummaries({ summaries }: StrandSummaryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {summaries.map((summary) => (
        <StrandCard key={summary.strand} summary={summary} />
      ))}
    </div>
  );
}

function StrandCard({ summary }: { summary: StrandSummary }) {
  const total = summary.total;
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <header>
        <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
          {STRAND_DISPLAY[summary.strand]}
        </h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          {total === 0
            ? "No actions yet"
            : `${total} action${total === 1 ? "" : "s"}`}
        </p>
      </header>
      {total > 0 && (
        <div
          className="flex h-1.5 overflow-hidden rounded-full bg-neutral-100"
          aria-label="Progress breakdown"
        >
          {PROGRESS_STATUSES.map((status) => {
            const count = summary.counts[status];
            if (count === 0) return null;
            const pct = (count / total) * 100;
            const colour = PROGRESS_STATUS_PILL_CLASSES[status].bg;
            return (
              <span
                key={status}
                className={colour}
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            );
          })}
        </div>
      )}
      <ul className="flex flex-wrap gap-1.5 text-[11px]">
        {PROGRESS_STATUSES.map((status) => {
          const count = summary.counts[status];
          if (count === 0) return null;
          const colour = PROGRESS_STATUS_PILL_CLASSES[status];
          return (
            <li
              key={status}
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${colour.bg} ${colour.fg}`}
            >
              <span>{status}</span>
              <span className="font-semibold">{count}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
