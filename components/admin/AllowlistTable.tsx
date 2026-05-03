"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { EditorAllowlistEntry } from "@/lib/admin/editors";

interface Props {
  entries: EditorAllowlistEntry[];
  projectNameById: Map<string, string>;
  highlightId: string | null;
  onRemoved: (entry: EditorAllowlistEntry) => void;
}

type SortKey = "email" | "project" | "grantedAt";
type SortDir = "asc" | "desc";

/**
 * Sortable, filter-narrowing table of editor → project mappings.
 * Sticky header so the column labels stay visible when the table is
 * tall (we don't paginate; the corpus is bounded ~50–200 rows).
 *
 * Inline remove confirmation per row — no modal — keeps the row count
 * from changing too suddenly. Escape cancels the prompt.
 */
export function AllowlistTable({
  entries,
  projectNameById,
  highlightId,
  onRemoved,
}: Props) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("grantedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const decorated = entries.map((entry) => ({
      entry,
      projectName: projectNameById.get(entry.projectId) ?? entry.projectId,
    }));
    const narrowed = q
      ? decorated.filter(
          ({ entry, projectName }) =>
            entry.email.toLowerCase().includes(q) ||
            projectName.toLowerCase().includes(q),
        )
      : decorated;
    return narrowed.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "email":
          return a.entry.email.localeCompare(b.entry.email) * dir;
        case "project":
          return a.projectName.localeCompare(b.projectName) * dir;
        case "grantedAt":
          return (
            (Date.parse(a.entry.grantedAt) - Date.parse(b.entry.grantedAt)) *
            dir
          );
      }
    });
  }, [entries, filter, sortKey, sortDir, projectNameById]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "grantedAt" ? "desc" : "asc");
    }
  }

  async function remove(entry: EditorAllowlistEntry) {
    setRemovingId(entry.id);
    setRemoveError(null);
    try {
      const response = await fetch(`/api/admin/editors/${entry.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setRemoveError(payload.error ?? `Request failed (${response.status})`);
        return;
      }
      onRemoved(entry);
      setConfirmingId(null);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section
      aria-labelledby="allowlist-table-heading"
      className="rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
        <h2
          id="allowlist-table-heading"
          className="text-sm font-semibold uppercase tracking-wide text-neutral-700"
        >
          Editors ({entries.length})
        </h2>
        <div className="w-72">
          <label htmlFor="allowlist-filter" className="sr-only">
            Filter by email or project
          </label>
          <input
            id="allowlist-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by email or project"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-neutral-600">
          No editors granted yet. Use the form above to grant project edit access.
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-neutral-600">
          No mappings match &ldquo;{filter}&rdquo;.{" "}
          <button
            type="button"
            onClick={() => setFilter("")}
            className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="sticky top-0 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
              <tr>
                <SortableHeader
                  label="Email"
                  active={sortKey === "email"}
                  dir={sortDir}
                  onClick={() => toggleSort("email")}
                  className="w-1/3"
                />
                <SortableHeader
                  label="Project"
                  active={sortKey === "project"}
                  dir={sortDir}
                  onClick={() => toggleSort("project")}
                  className="w-1/3"
                />
                <SortableHeader
                  label="Granted"
                  active={sortKey === "grantedAt"}
                  dir={sortDir}
                  onClick={() => toggleSort("grantedAt")}
                  className="w-1/4"
                />
                <th scope="col" className="w-24 px-4 py-2 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ entry, projectName }) => (
                <Row
                  key={entry.id}
                  entry={entry}
                  projectName={projectName}
                  highlighted={entry.id === highlightId}
                  confirming={entry.id === confirmingId}
                  removing={entry.id === removingId}
                  onAskConfirm={() => {
                    setRemoveError(null);
                    setConfirmingId(entry.id);
                  }}
                  onCancelConfirm={() => setConfirmingId(null)}
                  onConfirm={() => remove(entry)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div aria-live="polite" className="min-h-[1.25rem] px-5 pb-3 pt-2">
        {removeError && (
          <p className="text-xs text-red-700">{removeError}</p>
        )}
      </div>
    </section>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 py-2 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-neutral-900"
      >
        {label}
        <span aria-hidden="true" className="text-[10px] text-neutral-400">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function Row({
  entry,
  projectName,
  highlighted,
  confirming,
  removing,
  onAskConfirm,
  onCancelConfirm,
  onConfirm,
}: {
  entry: EditorAllowlistEntry;
  projectName: string;
  highlighted: boolean;
  confirming: boolean;
  removing: boolean;
  onAskConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirm: () => void;
}) {
  const yesRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) yesRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!confirming) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelConfirm();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [confirming, onCancelConfirm]);

  return (
    <tr
      className={`border-t border-neutral-100 transition-colors ${
        highlighted ? "bg-blue-50" : ""
      }`}
    >
      <td className="px-4 py-3 text-neutral-900">{entry.email}</td>
      <td className="px-4 py-3 text-neutral-900">{projectName}</td>
      <td className="px-4 py-3 text-neutral-600" title={entry.grantedAt}>
        {formatRelative(entry.grantedAt)}
      </td>
      <td className="px-4 py-3 text-right">
        {confirming ? (
          <span className="inline-flex items-center gap-2 text-xs">
            <span className="text-neutral-700">Remove access?</span>
            <button
              ref={yesRef}
              type="button"
              onClick={onConfirm}
              disabled={removing}
              className="rounded-md bg-red-700 px-2 py-1 text-white hover:bg-red-800 disabled:opacity-60"
            >
              {removing ? "Removing…" : "Yes"}
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              disabled={removing}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-neutral-700 hover:border-neutral-400"
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={onAskConfirm}
            className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:border-red-400"
          >
            Remove
          </button>
        )}
      </td>
    </tr>
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
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
