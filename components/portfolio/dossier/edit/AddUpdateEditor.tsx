"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface AddUpdateEditorProps {
  projectId: string;
  onClose: () => void;
}

/**
 * Inline editor for appending a new entry to the project updates timeline.
 * Submits to PATCH /api/portfolios/[id] with `addUpdate: { title, bodyText }`.
 * The server wraps `bodyText` as a single-block Portable Text array and
 * sets `_key`, `authorEmail`, and `timestamp`.
 *
 * Spec: openspec/specs/edit-studio/spec.md (Portable Text editor for
 * updates / Adding an update).
 */
export function AddUpdateEditor({ projectId, onClose }: AddUpdateEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (title.trim().length === 0) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/portfolios/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          addUpdate: { title: title.trim(), bodyText },
        }),
      });
      if (response.ok) {
        router.refresh();
        onClose();
        return;
      }
      if (response.status === 403) {
        setError("You don't have permission to edit this project.");
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-neutral-200 bg-white p-4"
      aria-label="Add update"
    >
      <div className="space-y-1">
        <label
          htmlFor={`update-title-${projectId}`}
          className="block text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Title
        </label>
        <input
          id={`update-title-${projectId}`}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={submitting}
          className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`update-body-${projectId}`}
          className="block text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Body
        </label>
        <textarea
          id={`update-body-${projectId}`}
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
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
          {submitting ? "Saving…" : "Save update"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
