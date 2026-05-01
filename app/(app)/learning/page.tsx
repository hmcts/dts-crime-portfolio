import Link from "next/link";

import { LearningCard } from "@/components/learning/LearningCard";
import { LearningEmptyState } from "@/components/learning/LearningEmptyState";
import { TagChipRow } from "@/components/learning/TagChipRow";
import { TypeFilterRow } from "@/components/learning/TypeFilterRow";
import {
  applyLearningFilters,
  isLearningFiltersEmpty,
  parseLearningFilters,
  type LearningFilterSearchParams,
} from "@/lib/learning/filters";
import { listLearningItems } from "@/lib/learning/list";
import { unionLearningTags } from "@/lib/learning/tags";

export const dynamic = "force-dynamic";

interface LearningPageProps {
  searchParams: Promise<LearningFilterSearchParams>;
}

export default async function LearningPage({ searchParams }: LearningPageProps) {
  const resolvedParams = await searchParams;
  const filters = parseLearningFilters(resolvedParams);
  const filtersActive = !isLearningFiltersEmpty(filters);

  const all = await listLearningItems();
  const filtered = applyLearningFilters(all, filters);
  const tagUnion = unionLearningTags(all);

  const total = all.length;
  const filteredCount = filtered.length;

  let summary: string;
  if (total === 0) {
    summary = "No learning items yet.";
  } else if (filtersActive) {
    summary = `Showing ${filteredCount} of ${total} items`;
  } else {
    summary = `Showing ${total} of ${total} items`;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learning</h1>
          <p className="mt-1 text-sm text-neutral-600">{summary}</p>
        </div>
        {filtersActive && (
          <Link
            href="/learning"
            className="self-start rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
          >
            Clear filters
          </Link>
        )}
      </header>
      <section className="mt-4 flex flex-col gap-3" aria-label="Filters">
        <TypeFilterRow activeType={filters.type} />
        <TagChipRow tags={tagUnion} activeTags={filters.tags} />
      </section>
      {total === 0 ? (
        <div className="mt-6">
          <LearningEmptyState filtered={false} />
        </div>
      ) : filteredCount === 0 ? (
        <div className="mt-6">
          <LearningEmptyState filtered={true} />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <li key={item._id}>
              <LearningCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
