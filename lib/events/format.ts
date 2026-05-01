/**
 * Formatting helpers for the events listing. Times are rendered in UTC so
 * the same value displays identically server-side and client-side, and so
 * tests are deterministic.
 *
 * Spec: openspec/specs/events-listing/spec.md (event card date/time).
 */

export function formatEventDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${formatDate(parsed)} ${formatTime(parsed)}`;
}

export function formatEventTimeRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string {
  const start = formatEventDateTime(startsAt);
  const end = formatEventDateTime(endsAt);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function formatDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

/**
 * Filter to only events that have not yet ended. Used in tests because the
 * server-side query enforces the same constraint via GROQ; the helper is
 * exposed for unit tests and any future client-side derivations.
 */
export function filterFutureEvents<T extends { endsAt: string | null | undefined }>(
  events: T[],
  now: Date = new Date(),
): T[] {
  const cutoff = now.getTime();
  return events.filter((event) => {
    if (!event.endsAt) return false;
    const ends = new Date(event.endsAt).getTime();
    if (Number.isNaN(ends)) return false;
    return ends > cutoff;
  });
}
