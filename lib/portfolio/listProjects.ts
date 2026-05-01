import "server-only";

import { getSanityClient } from "@/lib/sanity/client";
import { PORTFOLIO_LIST_QUERY } from "./queries";
import type { PortfolioListItem } from "./types";

export async function listProjects(): Promise<PortfolioListItem[]> {
  const client = getSanityClient();
  return client.fetch<PortfolioListItem[]>(PORTFOLIO_LIST_QUERY);
}
