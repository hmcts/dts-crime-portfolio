"use client";

import { useMemo, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  id: string;
  label: string;
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
  error?: string;
}

/**
 * Multi-select chip picker for fields like business areas, additional
 * capabilities, and action plan links.
 */
export function MultiSelect({
  id,
  label,
  options,
  selectedIds,
  onChange,
  required,
  error,
}: MultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const remaining = options.filter((opt) => !selectedIds.includes(opt.value));
    if (!q) return remaining.slice(0, 25);
    return remaining.filter((opt) => opt.label.toLowerCase().includes(q)).slice(0, 25);
  }, [options, query, selectedIds]);

  const labelFor = (id: string) =>
    options.find((opt) => opt.value === id)?.label ?? "(missing)";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>

      {selectedIds.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selectedIds.map((sid) => (
            <li
              key={sid}
              className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-800"
            >
              <span>{labelFor(sid)}</span>
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((v) => v !== sid))}
                aria-label={`Remove ${labelFor(sid)}`}
                className="text-blue-700 hover:text-blue-900"
              >
                &times;
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
          placeholder="Add…"
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
                    onChange([...selectedIds, opt.value]);
                    setQuery("");
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
