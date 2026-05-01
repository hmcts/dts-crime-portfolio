import {
  PROGRESS_STATUS_PILL_CLASSES,
  type ProgressStatus,
} from "@/lib/enums/progress-status";

export function StatusPill({ status }: { status: ProgressStatus }) {
  const classes = PROGRESS_STATUS_PILL_CLASSES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${classes.bg} ${classes.fg}`}
    >
      {status}
    </span>
  );
}
