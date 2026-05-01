import { STAGE_LABELS, STAGE_PILL_CLASSES, type Stage } from "@/lib/enums/stage";

/**
 * Stage pill used by the portfolio card, dossier header, galaxy stars,
 * and PowerPoint exports. Source of truth for colours and labels is
 * `lib/enums/stage.ts`.
 */
export function StagePill({ stage }: { stage: Stage }) {
  const classes = STAGE_PILL_CLASSES[stage];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes.bg} ${classes.fg}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
