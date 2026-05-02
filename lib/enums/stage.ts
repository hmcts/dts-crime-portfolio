export const STAGES = ["idea", "scan", "pilot", "scale", "stalled", "sunset"] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idea",
  scan: "Scan",
  pilot: "Pilot",
  scale: "Scale",
  stalled: "Stalled",
  sunset: "Sunset",
};

// Tailwind class pairs for stage pills. Used by portfolio cards, dossier
// header, and PowerPoint exports — keep in sync with each.
export const STAGE_PILL_CLASSES: Record<Stage, { bg: string; fg: string }> = {
  idea: { bg: "bg-neutral-100", fg: "text-neutral-700" },
  scan: { bg: "bg-amber-100", fg: "text-amber-800" },
  pilot: { bg: "bg-blue-100", fg: "text-blue-800" },
  scale: { bg: "bg-emerald-100", fg: "text-emerald-800" },
  stalled: { bg: "bg-orange-100", fg: "text-orange-800" },
  sunset: { bg: "bg-neutral-200", fg: "text-neutral-600" },
};

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}
