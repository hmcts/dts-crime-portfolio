export const PROGRESS_STATUSES = [
  "Completed",
  "Significant progress",
  "Some progress",
  "Gap / More work needed",
] as const;

export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

// RAG-style colour mapping for action plan strand cards and pills.
export const PROGRESS_STATUS_PILL_CLASSES: Record<ProgressStatus, { bg: string; fg: string }> = {
  Completed: { bg: "bg-emerald-100", fg: "text-emerald-800" },
  "Significant progress": { bg: "bg-blue-100", fg: "text-blue-800" },
  "Some progress": { bg: "bg-amber-100", fg: "text-amber-800" },
  "Gap / More work needed": { bg: "bg-rose-100", fg: "text-rose-800" },
};

export function isProgressStatus(value: unknown): value is ProgressStatus {
  return typeof value === "string" && (PROGRESS_STATUSES as readonly string[]).includes(value);
}
