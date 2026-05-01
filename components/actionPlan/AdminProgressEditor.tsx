"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PortableTextBlock } from "@portabletext/types";

import {
  PROGRESS_STATUSES,
  type ProgressStatus,
} from "@/lib/enums/progress-status";

interface AdminProgressEditorProps {
  actionNo: string;
  initialProgressStatus: ProgressStatus;
  initialSummary: PortableTextBlock[] | null;
  onClose: () => void;
}

/**
 * Admin-only inline editor for an Action's `progressStatus` and
 * `summaryOfProgress`. Submits to PATCH /api/action-plan/[actionNo]. The
 * `summaryText` field is plain text from a `<textarea>` — the API server
 * wraps it as a single Portable Text block before storing.
 *
 * Spec: openspec/specs/action-plan-tracking/spec.md (Admin progress editing).
 */
export function AdminProgressEditor({
  actionNo,
  initialProgressStatus,
  initialSummary,
  onClose,
}: AdminProgressEditorProps) {
  const router = useRouter();
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>(initialProgressStatus);
  const [summaryText, setSummaryText] = useState<string>(
    portableTextToPlain(initialSummary),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/action-plan/${encodeURIComponent(actionNo)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ progressStatus, summaryText }),
      });
      if (response.ok) {
        router.refresh();
        onClose();
        return;
      }
      if (response.status === 403) {
        setError("You don't have permission to edit this action.");
      } else if (response.status === 401) {
        setError("Your session has expired. Please refresh and sign in again.");
      } else {
        setError("Save failed. Please try again.");
      }
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setProgressStatus(initialProgressStatus);
    setSummaryText(portableTextToPlain(initialSummary));
    setError(null);
    onClose();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-md border border-neutral-200 bg-white p-4"
      aria-label="Edit action progress"
    >
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Progress status
        </legend>
        <div className="space-y-1.5">
          {PROGRESS_STATUSES.map((status) => (
            <label
              key={status}
              className="flex items-center gap-2 text-sm text-neutral-800"
            >
              <input
                type="radio"
                name="progressStatus"
                value={status}
                checked={progressStatus === status}
                onChange={() => setProgressStatus(status)}
                disabled={submitting}
              />
              <span>{status}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label
          htmlFor={`summaryText-${actionNo}`}
          className="block text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Summary of progress
        </label>
        <textarea
          id={`summaryText-${actionNo}`}
          value={summaryText}
          onChange={(event) => setSummaryText(event.target.value)}
          disabled={submitting}
          rows={6}
          className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-[11px] text-neutral-500">
          Plain text. Stored as a single-block Portable Text entry — a richer editor will
          replace this textarea later.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save progress"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function portableTextToPlain(blocks: PortableTextBlock[] | null): string {
  if (!blocks || blocks.length === 0) return "";
  return blocks
    .map((block) => {
      const children = (block as { children?: Array<{ text?: string }> }).children;
      if (!children) return "";
      return children.map((child) => child.text ?? "").join("");
    })
    .join("\n\n");
}
