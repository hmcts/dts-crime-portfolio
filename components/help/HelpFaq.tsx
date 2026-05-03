"use client";

import { useMemo, useState } from "react";

import { PortableTextRenderer } from "@/lib/portable-text/renderer";
import {
  filterFaqEntries,
  groupFaqEntriesBySection,
  type FaqEntry,
  type FaqSection,
} from "@/lib/help/types";
import { FAQ_SECTIONS } from "@/lib/help/sections";

interface HelpFaqProps {
  entries: FaqEntry[];
}

/**
 * Client-side FAQ surface. The full list is fetched on the server and handed
 * in as a prop; this component owns the search input, the expand-all toggle,
 * and per-panel open state. When a search query is active, matching panels
 * auto-expand so the snippet that matched is visible.
 *
 * Spec: openspec/specs/help-faq/spec.md (Expandable Q&A panels,
 * Cross-content search).
 */
export function HelpFaq({ entries }: HelpFaqProps) {
  const [query, setQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const trimmedQuery = query.trim();
  const filteredEntries = useMemo(
    () => filterFaqEntries(entries, trimmedQuery),
    [entries, trimmedQuery],
  );
  const grouped = useMemo(
    () => groupFaqEntriesBySection(filteredEntries),
    [filteredEntries],
  );

  const totalAfterFilter = filteredEntries.length;
  const hasQuery = trimmedQuery.length > 0;
  const noResults = hasQuery && totalAfterFilter === 0;

  // When searching, auto-expand the matches; otherwise honour the
  // expand-all toggle and per-panel manual state.
  const isOpen = (id: string) => {
    if (hasQuery) return true;
    if (allExpanded) return true;
    return openIds.has(id);
  };

  const togglePanel = (id: string, next: boolean) => {
    if (hasQuery) return; // panels are forced open while searching
    setOpenIds((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  };

  const handleExpandAll = () => {
    setAllExpanded(true);
    setOpenIds(new Set(entries.map((entry) => entry._id)));
  };

  const handleCollapseAll = () => {
    setAllExpanded(false);
    setOpenIds(new Set());
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <label htmlFor="help-search" className="sr-only">
            Search FAQs
          </label>
          <input
            id="help-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search FAQs..."
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {allExpanded ? (
            <button
              type="button"
              onClick={handleCollapseAll}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400"
            >
              Collapse all
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExpandAll}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400"
            >
              Expand all
            </button>
          )}
        </div>
      </div>

      {noResults ? (
        <EmptyState onClear={() => setQuery("")} query={trimmedQuery} />
      ) : (
        <div className="space-y-8">
          {FAQ_SECTIONS.map((section) => (
            <FaqSectionBlock
              key={section}
              section={section}
              entries={grouped[section]}
              isOpen={isOpen}
              onToggle={togglePanel}
              hasQuery={hasQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FaqSectionBlockProps {
  section: FaqSection;
  entries: FaqEntry[];
  isOpen: (id: string) => boolean;
  onToggle: (id: string, next: boolean) => void;
  hasQuery: boolean;
}

function FaqSectionBlock({ section, entries, isOpen, onToggle, hasQuery }: FaqSectionBlockProps) {
  // While a query is active we hide sections that match nothing so the page
  // doesn't read as a wall of "No entries yet" lines for non-matching sections.
  if (hasQuery && entries.length === 0) return null;
  return (
    <section className="scroll-mt-6">
      <h2 className="text-sm font-semibold tracking-tight text-neutral-900">{section}</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">No entries yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => (
            <li key={entry._id}>
              <FaqPanel
                entry={entry}
                open={isOpen(entry._id)}
                onToggle={(next) => onToggle(entry._id, next)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface FaqPanelProps {
  entry: FaqEntry;
  open: boolean;
  onToggle: (next: boolean) => void;
}

function FaqPanel({ entry, open, onToggle }: FaqPanelProps) {
  return (
    <details
      open={open}
      onToggle={(event) => {
        const target = event.currentTarget;
        if (target.open !== open) {
          onToggle(target.open);
        }
      }}
      className="group rounded-md border border-neutral-200 bg-white shadow-sm open:border-neutral-300"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-neutral-900 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">
          <span className="mr-2 text-xs font-mono text-neutral-500">{entry.number}.</span>
          {entry.question}
        </span>
        <span
          aria-hidden="true"
          className="ml-2 select-none text-neutral-400 transition-transform group-open:rotate-180"
        >
          {/* simple chevron */}
          v
        </span>
      </summary>
      <div className="border-t border-neutral-100 px-4 pb-4 pt-2 text-sm">
        {entry.answer && entry.answer.length > 0 ? (
          <PortableTextRenderer value={entry.answer} />
        ) : (
          <p className="mt-2 text-xs text-neutral-500">No answer recorded yet.</p>
        )}
      </div>
    </details>
  );
}

interface EmptyStateProps {
  query: string;
  onClear: () => void;
}

function EmptyState({ query, onClear }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <p className="text-sm text-neutral-700">
        No FAQs match &ldquo;{query}&rdquo;.
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Try a shorter query or browse the sections directly.
      </p>
      <div className="mt-4 flex items-center justify-center">
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400"
        >
          Clear search
        </button>
      </div>
    </div>
  );
}
