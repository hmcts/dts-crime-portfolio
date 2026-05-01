import { ToggleFilterButton } from "@/components/portfolio/ToggleFilterButton";
import { PROMPT_TAGS, type PromptTag } from "@/lib/prompts/types";

const BASE =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition";
const INACTIVE = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";
const ACTIVE = "border-blue-600 bg-blue-50 text-blue-800";

export function TagFilterRow({ activeTags }: { activeTags: PromptTag[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Tags
      </span>
      {PROMPT_TAGS.map((tag) => {
        const active = activeTags.includes(tag);
        const className = active ? `${BASE} ${ACTIVE}` : `${BASE} ${INACTIVE}`;
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
      <span className="text-xs text-neutral-400" aria-hidden>
        More tags
      </span>
    </div>
  );
}
