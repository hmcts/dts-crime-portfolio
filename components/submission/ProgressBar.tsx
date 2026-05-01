"use client";

import type { SectionDef } from "./types";

interface ProgressBarProps {
  sections: readonly SectionDef[];
  currentIndex: number;
  /** True when the user has reached the final review screen. */
  reviewing: boolean;
}

/**
 * Compact progress bar across the six survey sections plus a final Review
 * step. Reflects the current section per the spec's progress requirement.
 */
export function ProgressBar({ sections, currentIndex, reviewing }: ProgressBarProps) {
  const total = sections.length + 1; // +1 for Review
  const activeIndex = reviewing ? sections.length : currentIndex;
  const completed = activeIndex; // sections strictly before active are completed

  return (
    <nav aria-label="Submission progress" className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <span>
          Step {activeIndex + 1} of {total}
        </span>
        <span className="font-medium text-neutral-800">
          {reviewing ? "Review" : sections[currentIndex]!.label}
        </span>
      </div>
      <ol className="flex gap-1">
        {sections.map((section, index) => {
          const isActive = !reviewing && index === currentIndex;
          const isComplete = index < completed;
          return (
            <li
              key={section.id}
              className={`h-1.5 flex-1 rounded-full ${
                isActive
                  ? "bg-blue-500"
                  : isComplete
                    ? "bg-blue-300"
                    : "bg-neutral-200"
              }`}
              aria-current={isActive ? "step" : undefined}
              title={section.label}
            />
          );
        })}
        <li
          className={`h-1.5 flex-1 rounded-full ${
            reviewing ? "bg-blue-500" : "bg-neutral-200"
          }`}
          aria-current={reviewing ? "step" : undefined}
          title="Review"
        />
      </ol>
    </nav>
  );
}
