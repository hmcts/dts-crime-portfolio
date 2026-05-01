import Link from "next/link";

/**
 * Spec: openspec/specs/portfolio-management/spec.md (Empty portfolio).
 */
export function PortfolioEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <p className="text-sm text-neutral-700">No projects to show yet.</p>
      <p className="mt-1 text-xs text-neutral-500">
        Submit the first one or create a record in the Sanity Studio.
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Link
          href="/portfolio/submit"
          className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
        >
          New Project
        </Link>
        <Link
          href="/studio"
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400"
        >
          Open Studio
        </Link>
      </div>
    </div>
  );
}
