import type { Stage } from "@/lib/enums/stage";

/**
 * Minimal project shape used by the v0 galaxy view. Only fields needed to
 * render a labelled circle and link to the dossier are fetched. Spec:
 * openspec/specs/galaxy-view/spec.md (full canvas/WebGL view is deferred).
 */
export interface GalaxyProject {
  _id: string;
  name: string;
  projectStage: Stage | null;
  capability: string | null;
}

export const GALAXY_LENSES = ["stage", "capability"] as const;
export type GalaxyLens = (typeof GALAXY_LENSES)[number];

export const GALAXY_LENS_LABELS: Record<GalaxyLens, string> = {
  stage: "Stage",
  capability: "Capability",
};

export function isGalaxyLens(value: unknown): value is GalaxyLens {
  return typeof value === "string" && (GALAXY_LENSES as readonly string[]).includes(value);
}
