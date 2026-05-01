import {
  PROMPT_TOOLS,
  PROMPT_TOOL_BADGE_CLASSES,
  PROMPT_TOOL_LABELS,
  type PromptTool,
} from "@/lib/prompts/types";

import { SetParamButton } from "./SetParamButton";

const BASE =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition";
const INACTIVE = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";
const ACTIVE_RING = "ring-2 ring-offset-1 ring-blue-500";

export function ToolFilterRow({ activeTool }: { activeTool: PromptTool | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Tool
      </span>
      {PROMPT_TOOLS.map((tool) => {
        const active = activeTool === tool;
        const colour = PROMPT_TOOL_BADGE_CLASSES[tool];
        const className = active
          ? `${BASE} ${colour.bg} ${colour.fg} border-transparent`
          : `${BASE} ${INACTIVE}`;
        return (
          <SetParamButton
            key={tool}
            paramName="tool"
            value={tool}
            active={active}
            toggleOffWhenActive
            className={className}
            activeClassName={ACTIVE_RING}
          >
            {PROMPT_TOOL_LABELS[tool]}
          </SetParamButton>
        );
      })}
    </div>
  );
}
