import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchEventById } from "@/lib/events/list";
import { formatEventTimeRange } from "@/lib/events/format";
import { PortableTextRenderer } from "@/lib/portable-text/renderer";

export const dynamic = "force-dynamic";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await fetchEventById(id);
  if (!event) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <nav className="text-sm">
        <Link
          href="/events"
          className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          ← Back to events
        </Link>
      </nav>
      <header className="mt-4 border-b border-neutral-200 pb-4">
        {event.category && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            {event.category}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
          {event.title}
        </h1>
        <p className="mt-2 text-sm text-neutral-700">
          {formatEventTimeRange(event.startsAt, event.endsAt)}
        </p>
        {event.location && (
          <p className="mt-1 text-sm text-neutral-600">{event.location}</p>
        )}
      </header>
      <article className="mt-4">
        {event.body && event.body.length > 0 ? (
          <PortableTextRenderer value={event.body} />
        ) : (
          <p className="text-sm text-neutral-500">No further details have been added.</p>
        )}
      </article>
    </main>
  );
}
