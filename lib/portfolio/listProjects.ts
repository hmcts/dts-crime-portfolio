import "server-only";

import { getSanityClient } from "@/lib/sanity/client";
import { portfolioFiltersToQueryParams, type PortfolioFilters } from "./filters";
import { PORTFOLIO_LIST_QUERY } from "./queries";
import type { PortfolioListResponse } from "./types";

export async function listProjects(filters: PortfolioFilters): Promise<PortfolioListResponse> {
  const client = getSanityClient();
  return client.fetch<PortfolioListResponse>(
    PORTFOLIO_LIST_QUERY,
    portfolioFiltersToQueryParams(filters),
  );
}
