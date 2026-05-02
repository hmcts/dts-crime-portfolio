"use client";

import {
  GALAXY_OVERLAYS,
  GALAXY_OVERLAY_COLORS,
  GALAXY_OVERLAY_LABELS,
  type GalaxyOverlay,
} from "@/lib/galaxy/types";

/**
 * Toggle panel for signal overlays. Multiple overlays can be active at
 * once (URL is comma-separated). Spec:
 * openspec/specs/galaxy-view/spec.md (Signal overlays).
 */
export function GalaxyOverlayPanel({
  activeOverlays,
  onToggle,
}: {
  activeOverlays: GalaxyOverlay[];
  onToggle: (overlay: GalaxyOverlay) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Overlays
      </legend>
      {GALAXY_OVERLAYS.map((overlay) => {
        const active = activeOverlays.includes(overlay);
        return (
          <button
            key={overlay}
            type="button"
            onClick={() => onToggle(overlay)}
            aria-pressed={active}
            className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-neutral-900 bg-white text-neutral-900"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: GALAXY_OVERLAY_COLORS[overlay] }}
            />
            {GALAXY_OVERLAY_LABELS[overlay]}
          </button>
        );
      })}
    </fieldset>
  );
}
