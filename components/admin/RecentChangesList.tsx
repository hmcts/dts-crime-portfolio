"use client";

export interface ChangeEvent {
  kind: "granted" | "revoked";
  id: string;
  email: string;
  projectName: string;
  actor: string;
  at: string; // ISO
}

interface Props {
  changes: ChangeEvent[];
}

/**
 * Audit footer — last 5 changes from the current admin's session.
 * Hidden entirely when there are no changes (per the brief: empty
 * state is clutter, not reassurance). The full audit trail lives in
 * Sanity ChangeLog; this is a session-scoped reassurance strip.
 */
export function RecentChangesList({ changes }: Props) {
  if (changes.length === 0) return null;
  return (
    <section
      aria-labelledby="recent-changes-heading"
      className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <h2
        id="recent-changes-heading"
        className="text-sm font-semibold uppercase tracking-wide text-neutral-700"
      >
        Last {changes.length} change{changes.length === 1 ? "" : "s"}
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-neutral-700">
        {changes.map((change) => (
          <li key={`${change.id}-${change.at}`} className="flex flex-wrap items-baseline gap-x-2">
            <span>
              <strong className="font-semibold text-neutral-900">{change.actor}</strong>{" "}
              {change.kind === "granted" ? "granted" : "revoked"}{" "}
              <strong className="font-semibold text-neutral-900">{change.email}</strong>{" "}
              {change.kind === "granted" ? "access to" : "access from"}{" "}
              <strong className="font-semibold text-neutral-900">{change.projectName}</strong>
            </span>
            <span className="text-xs text-neutral-500" title={change.at}>
              — {formatRelative(change.at)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
