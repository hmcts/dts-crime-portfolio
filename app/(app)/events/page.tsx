import Link from "next/link";

import { EventCard } from "@/components/events/EventCard";
import { EventFilters } from "@/components/events/EventFilters";
import {
  EventsEmptyState,
  NoMatchingEventsEmptyState,
} from "@/components/events/EventsEmptyState";
import { SearchInput } from "@/components/portfolio/SearchInput";
import {
  isEventsFiltersEmpty,
  parseEventsFilters,
  type EventsFilterSearchParams,
} from "@/lib/events/filters";
import { listEvents } from "@/lib/events/list";

export const dynamic = "force-dynamic";

interface EventsPageProps {
  searchParams: Promise<EventsFilterSearchParams>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const resolvedParams = await searchParams;
  const filters = parseEventsFilters(resolvedParams);
  const filtersActive = !isEventsFiltersEmpty(filters);

  const { events, categories, locations } = await listEvents(filters);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Upcoming sessions, workshops, and meet-ups.
          </p>
        </div>
        {filtersActive && (
          <Link
            href="/events"
            className="self-start rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
          >
            Clear filters
          </Link>
        )}
      </header>
      <section className="mt-4 flex flex-col gap-3" aria-label="Event filters">
        <SearchInput initial={filters.search} />
        <EventFilters filters={filters} categories={categories} locations={locations} />
      </section>
      {events.length === 0 ? (
        <div className="mt-6">
          {filtersActive ? <NoMatchingEventsEmptyState /> : <EventsEmptyState />}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event._id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
