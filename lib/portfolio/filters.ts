import { isStage, type Stage } from "@/lib/enums/stage";
import { isTier, type Tier } from "@/lib/enums/tier";

/**
 * Multi-select filter state for the /portfolio card grid. Mirrored to the
 * URL query string so filters are bookmarkable. Spec:
 * openspec/specs/portfolio-management/spec.md (Multi-select filters).
 *
 * Free-text search lives in this shape but the UI for it lands in a
 * follow-up PR; the server-side query already honours it.
 */
export interface PortfolioFilters {
  stages: Stage[];
  groupIds: string[];
  directorateIds: string[];
  businessAreaIds: string[];
  ownerIds: string[];
  capabilityIds: string[];
  tiers: Tier[];
  actionIds: string[];
  search: string;
}

export type PortfolioFilterSearchParams = Record<string, string | string[] | undefined>;

const KEYS = {
  stage: "stage",
  group: "group",
  directorate: "directorate",
  businessArea: "businessArea",
  owner: "owner",
  capability: "capability",
  tier: "tier",
  action: "action",
  search: "q",
} as const;

export function emptyPortfolioFilters(): PortfolioFilters {
  return {
    stages: [],
    groupIds: [],
    directorateIds: [],
    businessAreaIds: [],
    ownerIds: [],
    capabilityIds: [],
    tiers: [],
    actionIds: [],
    search: "",
  };
}

export function parsePortfolioFilters(
  params: PortfolioFilterSearchParams,
): PortfolioFilters {
  const stages = readMulti(params, KEYS.stage).filter(isStage);
  const tiers = readMulti(params, KEYS.tier)
    .map((value) => Number(value))
    .filter(isTier);
  const search = readSingle(params, KEYS.search).trim();

  return {
    stages,
    groupIds: readMulti(params, KEYS.group),
    directorateIds: readMulti(params, KEYS.directorate),
    businessAreaIds: readMulti(params, KEYS.businessArea),
    ownerIds: readMulti(params, KEYS.owner),
    capabilityIds: readMulti(params, KEYS.capability),
    tiers,
    actionIds: readMulti(params, KEYS.action),
    search,
  };
}

export function isPortfolioFiltersEmpty(filters: PortfolioFilters): boolean {
  return (
    filters.stages.length === 0 &&
    filters.groupIds.length === 0 &&
    filters.directorateIds.length === 0 &&
    filters.businessAreaIds.length === 0 &&
    filters.ownerIds.length === 0 &&
    filters.capabilityIds.length === 0 &&
    filters.tiers.length === 0 &&
    filters.actionIds.length === 0 &&
    filters.search === ""
  );
}

/**
 * Build the GROQ parameter map consumed by `PORTFOLIO_LIST_QUERY`. Keeps
 * one place to map TypeScript filter state into Sanity's query variables.
 */
export function portfolioFiltersToQueryParams(filters: PortfolioFilters) {
  return {
    stages: filters.stages,
    groupIds: filters.groupIds,
    directorateIds: filters.directorateIds,
    businessAreaIds: filters.businessAreaIds,
    ownerIds: filters.ownerIds,
    capabilityIds: filters.capabilityIds,
    tiers: filters.tiers,
    actionIds: filters.actionIds,
    search: filters.search,
    searchToken: filters.search ? `${filters.search}*` : "",
  };
}

function readMulti(params: PortfolioFilterSearchParams, key: string): string[] {
  const value = params[key];
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readSingle(params: PortfolioFilterSearchParams, key: string): string {
  const value = params[key];
  if (value === undefined) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}
