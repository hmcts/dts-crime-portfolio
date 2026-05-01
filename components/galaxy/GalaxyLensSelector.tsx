"use client";

import {
  GALAXY_LENSES,
  GALAXY_LENS_LABELS,
  type GalaxyLens,
} from "@/lib/galaxy/types";

/**
 * Lens picker for the galaxy view. Spec:
 * openspec/specs/galaxy-view/spec.md (Lens switcher).
 */
export function GalaxyLensSelector({
  activeLens,
  onChange,
}: {
  activeLens: GalaxyLens;
  onChange: (lens: GalaxyLens) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="galaxy-lens"
        className="text-xs font-medium uppercase tracking-wide text-neutral-500"
      >
        Re-cluster lens
      </label>
      <select
        id="galaxy-lens"
        name="lens"
        value={activeLens}
        onChange={(event) => onChange(event.target.value as GalaxyLens)}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {GALAXY_LENSES.map((lens) => (
          <option key={lens} value={lens}>
            {GALAXY_LENS_LABELS[lens]}
          </option>
        ))}
      </select>
    </div>
  );
}
