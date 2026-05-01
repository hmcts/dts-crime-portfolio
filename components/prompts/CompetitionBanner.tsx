import { formatCompetitionMonthLabel } from "@/lib/prompts/format";
import {
  PROMPT_TOOL_BADGE_CLASSES,
  PROMPT_TOOL_LABELS,
  type PromptListItem,
} from "@/lib/prompts/types";

interface CompetitionBannerProps {
  winner: PromptListItem | null;
  currentMonth: string;
}

/**
 * Monthly competition banner. Shows the current month's winner if any —
 * otherwise renders a "no winner yet" placeholder so the page never has
 * an empty hero. Spec: `openspec/specs/prompts-library/spec.md`
 * (Default view).
 */
export function CompetitionBanner({ winner, currentMonth }: CompetitionBannerProps) {
  const monthLabel = formatCompetitionMonthLabel(currentMonth);

  if (!winner) {
    return (
      <section
        aria-label="Monthly competition"
        className="rounded-xl border border-amber-200 bg-amber-50 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          {monthLabel} prompt of the month
        </p>
        <p className="mt-1 text-sm text-amber-900">
          No winner picked yet — get your prompt in to stand a chance.
        </p>
      </section>
    );
  }

  const colour = PROMPT_TOOL_BADGE_CLASSES[winner.tool];

  return (
    <section
      aria-label="Monthly competition winner"
      className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        ✨ {monthLabel} prompt of the month
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight text-neutral-900">
            {winner.title}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-700">
            by {winner.authorName ?? "Unknown"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${colour.bg} ${colour.fg}`}
          >
            {PROMPT_TOOL_LABELS[winner.tool]}
          </span>
          <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-medium text-neutral-700 ring-1 ring-amber-200">
            {winner.upvoteCount} upvote{winner.upvoteCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </section>
  );
}
