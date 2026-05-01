import type { PromptSort } from "@/lib/prompts/types";

import { SetParamButton } from "./SetParamButton";

interface SortTabsProps {
  active: PromptSort;
}

const TABS: ReadonlyArray<{ sort: PromptSort; label: string }> = [
  { sort: "recommended", label: "✨ Recommended" },
  { sort: "upvotes", label: "🔥 Most upvotes" },
  { sort: "new", label: "🆕 Just added" },
  { sort: "comments", label: "💬 Most comments" },
];

const BASE =
  "rounded-md border px-3 py-1.5 text-sm font-medium transition";
const INACTIVE = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";
const ACTIVE = "border-blue-600 bg-blue-600 text-white";

export function SortTabs({ active }: SortTabsProps) {
  return (
    <div role="tablist" aria-label="Sort prompts" className="flex flex-wrap items-center gap-2">
      {TABS.map((tab) => {
        const isActive = active === tab.sort;
        const className = isActive ? `${BASE} ${ACTIVE}` : `${BASE} ${INACTIVE}`;
        return (
          <SetParamButton
            key={tab.sort}
            paramName="sort"
            value={tab.sort}
            active={isActive}
            className={className}
          >
            {tab.label}
          </SetParamButton>
        );
      })}
    </div>
  );
}
