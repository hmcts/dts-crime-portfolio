"use client";

import { useMemo, useState } from "react";

export interface ChipOption {
  value: string;
  label: string;
}

interface MultiSelectChipsProps {
  id: string;
  label: string;
  options: ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
  error?: string;
}

/**
 * Searchable multi-select that renders selected entries as removable chips.
 * No inline create — multi-selects in the submission form are limited to
 * existing reference rows (business areas, additional capabilities,
 * action plan links).
 */
export function MultiSelectChips({
  id,
  label,
  options,
  selected,
  onChange,
  required,
  error,
}: MultiSelectChipsProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = options.filter((opt) => !selected.includes(opt.value));
    if (!q) return available.slice(0, 25);
    return available.filter((opt) => opt.label.toLowerCase().includes(q)).slice(0, 25);
  }, [options, selected, query]);

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((opt) => [opt.value, opt.label]));
    return selected.map((value) => ({ value, label: map.get(value) ?? "(missing)" }));
  }, [options, selected]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>
      {selectedLabels.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selectedLabels.map((chip) => (
            <li
              key={chip.value}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-900"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label}`}
                onClick={() => onChange(selected.filter((v) => v !== chip.value))}
                className="ml-0.5 text-blue-700 hover:text-blue-900"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Type to search…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          aria-invalid={Boolean(error)}
        />
        {open && filtered.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg">
            {filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange([...selected, opt.value]);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
