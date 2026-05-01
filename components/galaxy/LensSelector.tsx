"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { GALAXY_LENSES, GALAXY_LENS_LABELS, type GalaxyLens } from "@/lib/galaxy/types";

/**
 * Tiny client lens selector. Updates the `?lens=` query param via
 * `router.replace`. Spec: openspec/specs/galaxy-view/spec.md (Lens
 * switcher). This v0 placeholder only supports stage and capability —
 * the full lens set (Capability, Stage, Business area, Delivery area,
 * Governance) lands with the canvas/WebGL implementation.
 */
export function LensSelector({ activeLens }: { activeLens: GalaxyLens }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <form className="flex items-center gap-2">
      <label
        htmlFor="galaxy-lens"
        className="text-xs font-medium uppercase tracking-wide text-neutral-500"
      >
        Lens
      </label>
      <select
        id="galaxy-lens"
        name="lens"
        value={activeLens}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          params.set("lens", next);
          startTransition(() => {
            router.replace(`?${params.toString()}`);
          });
        }}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {GALAXY_LENSES.map((lens) => (
          <option key={lens} value={lens}>
            {GALAXY_LENS_LABELS[lens]}
          </option>
        ))}
      </select>
    </form>
  );
}
