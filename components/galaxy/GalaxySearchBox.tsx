"use client";

import { useEffect, useState } from "react";

/**
 * Debounced search input bound to `?q=` in the URL. Local state lets the
 * user type freely; we push the URL update once the input settles. Spec:
 * openspec/specs/galaxy-view/spec.md (Search and shared filters).
 */
export function GalaxySearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (localValue === value) return;
    const id = window.setTimeout(() => onChange(localValue), 180);
    return () => window.clearTimeout(id);
  }, [localValue, onChange, value]);

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        Search
      </span>
      <input
        type="search"
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        placeholder="Project name…"
        className="w-48 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />
    </label>
  );
}
