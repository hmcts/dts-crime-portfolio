import Link from "next/link";

import { formatEventDateTime } from "@/lib/events/format";
import type { EventListItem } from "@/lib/events/list";

/**
 * Card for a single event in the /events listing. Whole card is the link
 * target so it is keyboard focusable; clicking deep-links to /events/[id].
 *
 * Spec: openspec/specs/events-listing/spec.md (event card title, date/time,
 * location, category pill).
 */
export function EventCard({ event }: { event: EventListItem }) {
  return (
    <Link
      href={`/events/${event._id}`}
      className="block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">
          {event.title}
        </h2>
        {event.category && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-900">
            {event.category}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-neutral-700">{formatEventDateTime(event.startsAt)}</p>
      {event.location && (
        <p className="mt-1 text-sm text-neutral-600">{event.location}</p>
      )}
    </Link>
  );
}
