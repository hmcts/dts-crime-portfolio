"use client";

import { useState } from "react";
import type { PortableTextBlock } from "@portabletext/types";

import { AdminProgressEditor } from "@/components/actionPlan/AdminProgressEditor";
import { PortableTextRenderer } from "@/lib/portable-text/renderer";
import type { ProgressStatus } from "@/lib/enums/progress-status";

interface ProgressSummarySectionProps {
  actionNo: string;
  progressStatus: ProgressStatus;
  summaryOfProgress: PortableTextBlock[] | null;
  isAdmin: boolean;
}

/**
 * Read-only Portable Text view of an Action's progress summary, with an
 * Admin-only "Edit progress" toggle that swaps in `AdminProgressEditor`.
 *
 * Spec: openspec/specs/action-plan-tracking/spec.md (Admin progress editing).
 */
export function ProgressSummarySection({
  actionNo,
  progressStatus,
  summaryOfProgress,
  isAdmin,
}: ProgressSummarySectionProps) {
  const [editing, setEditing] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Summary of progress
        </h3>
        {isAdmin && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Edit progress
          </button>
        )}
      </div>

      {isAdmin && editing ? (
        <div className="mt-3">
          <AdminProgressEditor
            actionNo={actionNo}
            initialProgressStatus={progressStatus}
            initialSummary={summaryOfProgress}
            onClose={() => setEditing(false)}
          />
        </div>
      ) : summaryOfProgress && summaryOfProgress.length > 0 ? (
        <div className="mt-2 text-sm text-neutral-800">
          <PortableTextRenderer value={summaryOfProgress} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-neutral-500">No progress summary recorded yet.</p>
      )}
    </section>
  );
}
