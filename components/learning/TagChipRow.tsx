import { ToggleFilterButton } from "@/components/portfolio/ToggleFilterButton";

const CHIP_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition";
const INACTIVE = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";
const ACTIVE = "border-transparent bg-blue-600 text-white";

interface TagChipRowProps {
  tags: string[];
  activeTags: string[];
}

/**
 * Tag chips drawn from the union of `tags` across all published learning
 * items (computed server-side). Multi-select via `?tag=` with AND
 * semantics on the server. Spec: `openspec/specs/learning-hub/spec.md`.
 */
export function TagChipRow({ tags, activeTags }: TagChipRowProps) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Tag filter">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Tags
      </span>
      {tags.map((tag) => {
        const active = activeTags.includes(tag);
        const className = active ? `${CHIP_BASE} ${ACTIVE}` : `${CHIP_BASE} ${INACTIVE}`;
        return (
          <ToggleFilterButton
            key={tag}
            paramName="tag"
            value={tag}
            active={active}
            className={className}
          >
            {tag}
          </ToggleFilterButton>
        );
      })}
    </div>
  );
}
