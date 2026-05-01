import Link from "next/link";

import { PortfolioEmptyState } from "@/components/portfolio/PortfolioEmptyState";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { SearchInput } from "@/components/portfolio/SearchInput";
import { StageFilterRow } from "@/components/portfolio/StageFilterRow";
import { TierFilterRow } from "@/components/portfolio/TierFilterRow";
import {
  isPortfolioFiltersEmpty,
  parsePortfolioFilters,
  type PortfolioFilterSearchParams,
} from "@/lib/portfolio/filters";
import { listProjects } from "@/lib/portfolio/listProjects";

export const dynamic = "force-dynamic";

interface PortfolioPageProps {
  searchParams: Promise<PortfolioFilterSearchParams>;
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const resolvedParams = await searchParams;
  const filters = parsePortfolioFilters(resolvedParams);
  const filtersActive = !isPortfolioFiltersEmpty(filters);

  const { total, filtered } = await listProjects(filters);
  const filteredCount = filtered.length;

  let summary: string;
  if (total === 0) {
    summary = "No projects yet.";
  } else if (filtersActive) {
    summary = `Showing ${filteredCount} of ${total} projects`;
  } else {
    summary = `Showing ${total} of ${total} projects`;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-neutral-600">{summary}</p>
        </div>
        {filtersActive && (
          <Link
            href="/portfolio"
            className="self-start rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
          >
            Clear filters
          </Link>
        )}
      </header>
      <section className="mt-4 flex flex-col gap-3" aria-label="Filters">
        <SearchInput initial={filters.search} />
        <StageFilterRow activeStages={filters.stages} />
        <TierFilterRow activeTiers={filters.tiers} />
      </section>
      {total === 0 ? (
        <div className="mt-6">
          <PortfolioEmptyState />
        </div>
      ) : filteredCount === 0 ? (
        <NoMatchesEmptyState />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <li key={project._id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function NoMatchesEmptyState() {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <p className="text-sm text-neutral-700">No projects match the active filters.</p>
      <Link
        href="/portfolio"
        className="mt-3 inline-block text-xs font-medium text-blue-700 underline underline-offset-2"
      >
        Clear filters
      </Link>
    </div>
  );
}
