"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface DossierHeaderEditorProps {
  projectId: string;
  initialDescription: string | null;
  onClose: () => void;
}

/**
 * Inline editor for the project description shown in the dossier header.
 * Submits to PATCH /api/portfolios/[id]. Spec:
 * openspec/specs/edit-studio/spec.md (Inline edit affordances by role).
 */
export function DossierHeaderEditor({
  projectId,
  initialDescription,
  onClose,
}: DossierHeaderEditorProps) {
  const router = useRouter();
  const [description, setDescription] = useState<string>(initialDescription ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/portfolios/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: description.trim() === "" ? null : description }),
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

  function handleCancel() {
    setDescription(initialDescription ?? "");
    setError(null);
    onClose();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-neutral-200 bg-white p-4"
      aria-label="Edit project description"
    >
      <label
        htmlFor={`description-${projectId}`}
        className="block text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        Description
      </label>
      <textarea
        id={`description-${projectId}`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        disabled={submitting}
        rows={5}
        className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

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
          {submitting ? "Saving…" : "Save"}
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
