import Link from "next/link";

interface LearningEmptyStateProps {
  /** When true, the state is "filters returned nothing" rather than "nothing in CMS yet". */
  filtered: boolean;
}

/**
 * Empty state for the Learning hub. Two flavours: nothing published yet
 * vs. filters that excluded everything.
 */
export function LearningEmptyState({ filtered }: LearningEmptyStateProps) {
  if (filtered) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
        <p className="text-sm text-neutral-700">
          No learning items match the active filters.
        </p>
        <Link
          href="/learning"
          className="mt-3 inline-block text-xs font-medium text-blue-700 underline underline-offset-2"
        >
          Clear filters
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <p className="text-sm text-neutral-700">No learning items published yet.</p>
      <p className="mt-1 text-xs text-neutral-500">
        Add a video, guide, or playlist in Sanity Studio.
      </p>
      <Link
        href="/studio"
        className="mt-4 inline-block rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400"
      >
        Open Studio
      </Link>
    </div>
  );
}
