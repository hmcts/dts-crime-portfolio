"use client";

import type { GalaxyCluster } from "@/lib/galaxy/lenses";

/**
 * Legend listing each constellation with a colour swatch, name, project
 * count, and a "Focus" button that animates the camera. Spec:
 * openspec/specs/galaxy-view/spec.md (Constellation legend with focus).
 */
export function GalaxyLegend({
  clusters,
  onFocus,
  onFocusAll,
  disabled,
}: {
  clusters: GalaxyCluster[];
  onFocus: (key: string) => void;
  onFocusAll: () => void;
  disabled?: boolean;
}) {
  const populated = clusters.filter((c) => c.projects.length > 0);

  return (
    <aside className="w-full shrink-0 rounded-lg border border-neutral-200 bg-white lg:w-72">
      <header className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Constellations
        </h2>
        <button
          type="button"
          onClick={onFocusAll}
          disabled={disabled}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          Fit all
        </button>
      </header>
      <ul className="max-h-[480px] overflow-y-auto py-1">
        {populated.length === 0 ? (
          <li className="px-3 py-3 text-xs text-neutral-500">
            No projects match the current filters.
          </li>
        ) : (
          populated.map((cluster) => (
            <li
              key={cluster.key}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-neutral-300"
                style={{ backgroundColor: cluster.color }}
              />
              <span className="flex-1 truncate text-neutral-800" title={cluster.label}>
                {cluster.label}
              </span>
              <span className="text-xs text-neutral-500">
                {cluster.projects.length}
              </span>
              <button
                type="button"
                onClick={() => onFocus(cluster.key)}
                disabled={disabled}
                className="rounded-md border border-neutral-300 bg-white px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
              >
                Focus
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
