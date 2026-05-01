import Link from "next/link";

import { CompetitionBanner } from "@/components/prompts/CompetitionBanner";
import { PromptCard } from "@/components/prompts/PromptCard";
import { SortTabs } from "@/components/prompts/SortTabs";
import { TagFilterRow } from "@/components/prompts/TagFilterRow";
import { ToolFilterRow } from "@/components/prompts/ToolFilterRow";
import {
  applyPromptFilters,
  formatCompetitionMonth,
  isPromptFiltersDefault,
  parsePromptFilters,
  type PromptFilterSearchParams,
} from "@/lib/prompts/filters";
import { fetchPrompts } from "@/lib/prompts/list";

export const dynamic = "force-dynamic";

interface PromptsPageProps {
  searchParams: Promise<PromptFilterSearchParams>;
}

export default async function PromptsPage({ searchParams }: PromptsPageProps) {
  const resolvedParams = await searchParams;
  const filters = parsePromptFilters(resolvedParams);
  const filtersActive = !isPromptFiltersDefault(filters);

  const currentMonth = formatCompetitionMonth(new Date());
  const allPrompts = await fetchPrompts(filters);
  const sorted = applyPromptFilters(allPrompts, filters, { currentMonth });

  // The banner reflects the current month's winner regardless of active
  // filters, so it's drawn from the unfiltered set.
  const winner = allPrompts.find((prompt) => prompt.competitionMonth === currentMonth) ?? null;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prompts</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Community prompt library — copy what works, vote up the gems.
          </p>
        </div>
        {filtersActive && (
          <Link
            href="/prompts"
            className="self-start rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
          >
            Clear filters
          </Link>
        )}
      </header>

      <div className="mt-4">
        <CompetitionBanner winner={winner} currentMonth={currentMonth} />
      </div>

      <section className="mt-4 flex flex-col gap-3" aria-label="Filters">
        <TagFilterRow activeTags={filters.tags} />
        <ToolFilterRow activeTool={filters.tool} />
      </section>

      <section className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4" aria-label="Sort">
        <SortTabs active={filters.sort} />
        <p className="text-xs text-neutral-500" aria-live="polite">
          Showing {sorted.length} prompt{sorted.length === 1 ? "" : "s"}
        </p>
      </section>

      {sorted.length === 0 ? (
        <EmptyState filtersActive={filtersActive} />
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {sorted.map((prompt) => (
            <li key={prompt._id}>
              <PromptCard prompt={prompt} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function EmptyState({ filtersActive }: { filtersActive: boolean }) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <p className="text-sm text-neutral-700">
        {filtersActive
          ? "No prompts match the active filters."
          : "No prompts published yet."}
      </p>
      {filtersActive && (
        <Link
          href="/prompts"
          className="mt-3 inline-block text-xs font-medium text-blue-700 underline underline-offset-2"
        >
          Clear filters
        </Link>
      )}
    </div>
  );
}
