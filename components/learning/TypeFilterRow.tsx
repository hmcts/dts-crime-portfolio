import type { LearningType } from "@/lib/learning/types";

import { SingleSelectFilterButton } from "./SingleSelectFilterButton";

const PILL_BASE =
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition";
const INACTIVE = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";
const ACTIVE = "border-transparent bg-neutral-900 text-white";

interface TypeOption {
  value: LearningType | "";
  label: string;
}

const OPTIONS: TypeOption[] = [
  { value: "", label: "All" },
  { value: "video", label: "Videos" },
  { value: "playlist", label: "Playlists" },
  { value: "guide", label: "Guides" },
];

export function TypeFilterRow({ activeType }: { activeType: LearningType | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Type filter">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Type
      </span>
      {OPTIONS.map((option) => {
        const active = option.value === "" ? activeType === null : activeType === option.value;
        const className = active ? `${PILL_BASE} ${ACTIVE}` : `${PILL_BASE} ${INACTIVE}`;
        return (
          <SingleSelectFilterButton
            key={option.label}
            paramName="type"
            value={option.value}
            active={active}
            className={className}
          >
            {option.label}
          </SingleSelectFilterButton>
        );
      })}
    </div>
  );
}
