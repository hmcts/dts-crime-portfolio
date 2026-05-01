import { STAGES, STAGE_LABELS, STAGE_PILL_CLASSES, type Stage } from "@/lib/enums/stage";

import { ToggleFilterButton } from "./ToggleFilterButton";

const BASE_CLASSES =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition";
const INACTIVE = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";
const ACTIVE_RING = "ring-2 ring-offset-1";

export function StageFilterRow({ activeStages }: { activeStages: Stage[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Stage
      </span>
      {STAGES.map((stage) => {
        const active = activeStages.includes(stage);
        const colour = STAGE_PILL_CLASSES[stage];
        const className = active
          ? `${BASE_CLASSES} ${colour.bg} ${colour.fg} border-transparent`
          : `${BASE_CLASSES} ${INACTIVE}`;
        return (
          <ToggleFilterButton
            key={stage}
            paramName="stage"
            value={stage}
            active={active}
            className={className}
            activeClassName={ACTIVE_RING}
          >
            {STAGE_LABELS[stage]}
          </ToggleFilterButton>
        );
      })}
    </div>
  );
}
