import { isStage, type Stage } from "@/lib/enums/stage";

import {
  DEFAULT_GALAXY_LENS,
  GALAXY_OVERLAYS,
  isGalaxyLens,
  isGalaxyOverlay,
  type GalaxyLens,
  type GalaxyOverlay,
} from "./types";

/**
 * URL parsing for the galaxy view. Mirrors the portfolio's URL contract
 * (stage / capability / businessArea / directorate / q) so applying a
 * filter on `/portfolio` and navigating to `/galaxy` keeps the same
 * filter active. Spec: openspec/specs/galaxy-view/spec.md.
 *
 * Rather than depend on `lib/portfolio/filters.ts` (which carries
 * portfolio-only state like tiers and owners), this module reads the
 * exact same query-string keys and only the subset the canvas cares
 * about.
 */

export type GalaxySearchParams = Record<string, string | string[] | undefined>;

export interface GalaxyUrlState {
  lens: GalaxyLens;
  overlays: GalaxyOverlay[];
  search: string;
  stages: Stage[];
  capabilityIds: string[];
  businessAreaIds: string[];
  directorateIds: string[];
}

const KEYS = {
  lens: "lens",
  overlay: "overlay",
  search: "q",
  stage: "stage",
  capability: "capability",
  businessArea: "businessArea",
  directorate: "directorate",
} as const;

export function parseGalaxyUrl(params: GalaxySearchParams): GalaxyUrlState {
  return {
    lens: parseLens(params[KEYS.lens]),
    overlays: parseOverlays(params[KEYS.overlay]),
    search: readSingle(params, KEYS.search).trim(),
    stages: readMulti(params, KEYS.stage).filter(isStage),
    capabilityIds: readMulti(params, KEYS.capability),
    businessAreaIds: readMulti(params, KEYS.businessArea),
    directorateIds: readMulti(params, KEYS.directorate),
  };
}

function parseLens(raw: string | string[] | undefined): GalaxyLens {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isGalaxyLens(value) ? value : DEFAULT_GALAXY_LENS;
}

function parseOverlays(raw: string | string[] | undefined): GalaxyOverlay[] {
  if (raw === undefined) return [];
  const all = Array.isArray(raw) ? raw : [raw];
  const seen = new Set<GalaxyOverlay>();
  for (const entry of all) {
    for (const piece of entry.split(",")) {
      const trimmed = piece.trim();
      if (isGalaxyOverlay(trimmed)) {
        seen.add(trimmed);
      }
    }
  }
  // Preserve canonical ordering.
  return GALAXY_OVERLAYS.filter((overlay) => seen.has(overlay));
}

function readMulti(params: GalaxySearchParams, key: string): string[] {
  const value = params[key];
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readSingle(params: GalaxySearchParams, key: string): string {
  const value = params[key];
  if (value === undefined) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

export const GALAXY_URL_KEYS = KEYS;
