export const TIERS = [1, 2, 3] as const;

export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = {
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
};

export const TIER_TO_BE_COMPLETED_LABEL = "To be completed";

export function isTier(value: unknown): value is Tier {
  return value === 1 || value === 2 || value === 3;
}

// For UI display when the project's calculated tier is null.
export function tierLabel(tier: Tier | null | undefined): string {
  return tier == null ? TIER_TO_BE_COMPLETED_LABEL : TIER_LABELS[tier];
}
