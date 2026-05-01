"use client";

import { useMemo, useState } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id: string;
  label: string;
  options: SearchableSelectOption[];
  selectedId: string | null;
  newName: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onClear: () => void;
  allowCreate?: boolean;
  required?: boolean;
  error?: string;
}

/**
 * Searchable single-select dropdown with an inline "Create new" option.
 * Filters by typed value; when no exact match exists and `allowCreate` is
 * true, offers a `Create new "<typed>"` row that flips the form into
 * inline-create mode for that field.
 */
export function SearchableSelect({
  id,
  label,
  options,
  selectedId,
  newName,
  onSelect,
  onCreate,
  onClear,
  allowCreate = true,
  required,
  error,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 25);
    return options.filter((opt) => opt.label.toLowerCase().includes(q)).slice(0, 25);
  }, [options, query]);

  const trimmed = query.trim();
  const hasExactMatch = filtered.some((opt) => opt.label.toLowerCase() === trimmed.toLowerCase());

  const selectedLabel = selectedId
    ? options.find((opt) => opt.value === selectedId)?.label ?? "(missing)"
    : null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>

      {selectedLabel || newName ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm">
          <span className="truncate">
            {newName ? (
              <>
                <span className="font-medium">{newName}</span>{" "}
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                  pending review
                </span>
              </>
            ) : (
              selectedLabel
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              onClear();
              setQuery("");
              setOpen(false);
            }}
            className="text-xs text-blue-700 underline"
          >
            Change
          </button>
        </div>
      ) : (
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
            onBlur={() => {
              // Defer so option click can fire first.
              setTimeout(() => setOpen(false), 150);
            }}
            placeholder="Type to search…"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            aria-invalid={Boolean(error)}
          />
          {open && (filtered.length > 0 || (allowCreate && trimmed.length > 0 && !hasExactMatch)) ? (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg">
              {filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(opt.value);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
              {allowCreate && trimmed.length > 0 && !hasExactMatch ? (
                <li className="border-t border-neutral-100">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onCreate(trimmed);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    Create new &ldquo;{trimmed}&rdquo;
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
