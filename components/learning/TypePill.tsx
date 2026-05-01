import type { LearningType } from "@/lib/learning/types";

const TYPE_LABELS: Record<LearningType, string> = {
  video: "Video",
  playlist: "Playlist",
  guide: "Guide",
};

const TYPE_CLASSES: Record<LearningType, string> = {
  video: "bg-rose-100 text-rose-800",
  playlist: "bg-violet-100 text-violet-800",
  guide: "bg-emerald-100 text-emerald-800",
};

const FEATURED_CLASSES = "bg-amber-100 text-amber-900";

interface TypePillProps {
  type: LearningType;
  featured?: boolean;
}

/**
 * Pill rendered on a learning card. When `featured` is true the pill
 * reads "Featured" instead of the type label, per spec
 * (`openspec/specs/learning-hub/spec.md` — Card content per type).
 */
export function TypePill({ type, featured = false }: TypePillProps) {
  const label = featured ? "Featured" : TYPE_LABELS[type];
  const colour = featured ? FEATURED_CLASSES : TYPE_CLASSES[type];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colour}`}
    >
      {label}
    </span>
  );
}
