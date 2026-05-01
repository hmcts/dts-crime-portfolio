import type { Stage } from "@/lib/enums/stage";

/**
 * Shape returned by the portfolio list GROQ query. References are
 * resolved to flat name fields so the cards can render without further
 * lookups.
 */
export interface PortfolioListItem {
  _id: string;
  name: string;
  description: string | null;
  projectStage: Stage;
  group: string | null;
  directorate: string | null;
  businessAreas: string[] | null;
  capability: string | null;
  deliveryOwner: { name: string; email: string } | null;
  linkedActionsCount: number;
  lastUpdatedAt: string | null;
}

export interface PortfolioListResponse {
  total: number;
  filtered: PortfolioListItem[];
}
