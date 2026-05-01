/**
 * Empty state for the /events listing. Shown when there are no future
 * events in Sanity. The magnifier icon is an inline SVG so it does not
 * pull a runtime icon dependency.
 *
 * Spec: openspec/specs/events-listing/spec.md (Empty state).
 */
export function EventsEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
      <MagnifierIcon className="h-10 w-10 text-neutral-400" />
      <p className="mt-3 text-sm font-medium text-neutral-700">No upcoming events.</p>
      <p className="mt-1 text-xs text-neutral-500">
        Check back later, or create one in the Sanity Studio.
      </p>
    </div>
  );
}

export function NoMatchingEventsEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
      <MagnifierIcon className="h-10 w-10 text-neutral-400" />
      <p className="mt-3 text-sm font-medium text-neutral-700">
        No events match the active filters.
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Try a different category, location, or search term.
      </p>
    </div>
  );
}

function MagnifierIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="6" />
      <line x1="20" y1="20" x2="15.5" y2="15.5" />
    </svg>
  );
}
