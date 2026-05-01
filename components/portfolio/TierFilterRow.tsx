import { TIERS, TIER_LABELS, type Tier } from "@/lib/enums/tier";

import { ToggleFilterButton } from "./ToggleFilterButton";

const BASE = "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";
const INACTIVE = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";
const ACTIVE = "border-transparent bg-neutral-900 text-white";

export function TierFilterRow({ activeTiers }: { activeTiers: Tier[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Governance tier
      </span>
      {TIERS.map((tier) => {
        const active = activeTiers.includes(tier);
        return (
          <ToggleFilterButton
            key={tier}
            paramName="tier"
            value={String(tier)}
            active={active}
            className={`${BASE} ${active ? ACTIVE : INACTIVE}`}
          >
            {TIER_LABELS[tier]}
          </ToggleFilterButton>
        );
      })}
    </div>
  );
}
