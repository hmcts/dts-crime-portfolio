import Link from "next/link";

import type { LearningItem, LearningLevel } from "@/lib/learning/types";

import { TypePill } from "./TypePill";

const LEVEL_LABELS: Record<LearningLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function formatReadingTime(minutes: number | null, type: LearningItem["type"]): string | null {
  if (minutes === null || minutes === undefined) return null;
  const verb = type === "video" ? "min watch" : "min read";
  return `${minutes} ${verb}`;
}

/**
 * Learning card. The whole card is a link target so it's keyboard
 * focusable; clicking deep-links to `/learning/[id]`. For videos the
 * play overlay sits over the thumbnail area and brightens on hover.
 *
 * Spec: `openspec/specs/learning-hub/spec.md` — Card content per type.
 */
export function LearningCard({ item }: { item: LearningItem }) {
  const readingTime = formatReadingTime(item.readingTimeMinutes, item.type);
  const isVideo = item.type === "video";

  return (
    <Link
      href={`/learning/${item._id}`}
      className="group block overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {isVideo && (
        <div
          aria-hidden="true"
          className="relative flex aspect-video items-center justify-center bg-neutral-900 text-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-xl transition group-hover:bg-white/30">
            <PlayIcon />
          </span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-neutral-900">
            {item.title}
          </h2>
          <TypePill type={item.type} featured={item.featured} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
          {readingTime && (
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">
              {readingTime}
            </span>
          )}
          {item.level && (
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">
              {LEVEL_LABELS[item.level]}
            </span>
          )}
          {item.tags && item.tags.length > 0 && (
            <span className="text-neutral-500">
              {item.tags.slice(0, 3).join(" · ")}
              {item.tags.length > 3 && ` +${item.tags.length - 3}`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function PlayIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 4l10 6-10 6V4z" />
    </svg>
  );
}
