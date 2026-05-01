import type { Stage } from "@/lib/enums/stage";

/**
 * Project shape used by the galaxy view. The canvas implementation needs
 * enough metadata to:
 *   - cluster by every lens (capability, stage, business area, delivery
 *     area, governance)
 *   - compute signal overlays (compliance gaps, recent updates, stale
 *     updates)
 *   - filter by the same URL params as `/portfolio`
 *
 * Spec: openspec/specs/galaxy-view/spec.md.
 */
export interface GalaxyProject {
  _id: string;
  name: string;
  projectStage: Stage | null;
  capability: { _id: string; name: string } | null;
  businessAreas: { _id: string; name: string }[];
  directorate: { _id: string; name: string } | null;
  governanceBody: string | null;
  riskRegister: "yes" | "no" | "unknown" | null;
  dpiaInPlace: "complete" | "in-progress" | "not-required" | "missing" | null;
  lastUpdatedAt: string | null;
}

export const GALAXY_LENSES = [
  "capability",
  "stage",
  "business-area",
  "delivery-area",
  "governance",
] as const;
export type GalaxyLens = (typeof GALAXY_LENSES)[number];

export const GALAXY_LENS_LABELS: Record<GalaxyLens, string> = {
  capability: "Capability",
  stage: "Stage",
  "business-area": "Business area",
  "delivery-area": "Delivery area",
  governance: "Governance",
};

export const DEFAULT_GALAXY_LENS: GalaxyLens = "capability";

export function isGalaxyLens(value: unknown): value is GalaxyLens {
  return typeof value === "string" && (GALAXY_LENSES as readonly string[]).includes(value);
}

export const GALAXY_OVERLAYS = [
  "compliance-gaps",
  "updated-7d",
  "no-update-30d",
] as const;
export type GalaxyOverlay = (typeof GALAXY_OVERLAYS)[number];

export const GALAXY_OVERLAY_LABELS: Record<GalaxyOverlay, string> = {
  "compliance-gaps": "Compliance gaps",
  "updated-7d": "Updated in 7 days",
  "no-update-30d": "No update in 30 days",
};

/** Hex ring colour applied to stars matching the overlay. */
export const GALAXY_OVERLAY_COLORS: Record<GalaxyOverlay, string> = {
  "compliance-gaps": "#dc2626", // red-600
  "updated-7d": "#16a34a", // green-600
  "no-update-30d": "#d97706", // amber-600
};

export function isGalaxyOverlay(value: unknown): value is GalaxyOverlay {
  return (
    typeof value === "string" && (GALAXY_OVERLAYS as readonly string[]).includes(value)
  );
}
