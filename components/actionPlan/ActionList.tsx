import Link from "next/link";

import { StatusPill } from "@/components/actionPlan/StatusPill";
import {
  STRAND_DISPLAY,
  type ActionListItem,
  type Strand,
} from "@/lib/actionPlan/types";

interface ActionListProps {
  groupedActions: Record<Strand, ActionListItem[]>;
  selectedActionNo: string | null;
}

export function ActionList({ groupedActions, selectedActionNo }: ActionListProps) {
  const strands = Object.keys(groupedActions) as Strand[];
  return (
    <nav aria-label="Action list" className="space-y-4">
      {strands.map((strand) => {
        const actions = groupedActions[strand];
        if (actions.length === 0) return null;
        return (
          <div key={strand}>
            <h3 className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {STRAND_DISPLAY[strand]}
            </h3>
            <ul className="mt-2 space-y-1">
              {actions.map((action) => {
                const selected = action.actionNo === selectedActionNo;
                return (
                  <li key={action._id}>
                    <Link
                      href={`/action-plan?action=${encodeURIComponent(action.actionNo)}`}
                      aria-current={selected ? "page" : undefined}
                      scroll={false}
                      className={`flex flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition ${
                        selected
                          ? "border-blue-300 bg-blue-50"
                          : "border-transparent hover:border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-neutral-900">{action.actionNo}</span>
                        <StatusPill status={action.progressStatus} />
                      </span>
                      <span className="text-xs text-neutral-700">{action.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
