"use client";

import type { SectionErrors } from "./validation";
import type { SubmissionFormState } from "./types";

interface UpdatesSectionProps {
  state: SubmissionFormState;
  errors: SectionErrors;
  onChange: (next: SubmissionFormState) => void;
}

/**
 * Section 6 — optional first project update. Plain-text body only at
 * submission time — rich text editing happens in the project dossier
 * after submit (out of scope for this form).
 */
export function UpdatesSection({ state, errors, onChange }: UpdatesSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-neutral-600">
        You can leave a short first update describing where the project is now.
        Both fields are optional — if you skip them, no update will be created.
      </p>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="submission-update-title"
          className="text-sm font-medium text-neutral-800"
        >
          Update title
        </label>
        <input
          id="submission-update-title"
          type="text"
          value={state.firstUpdateTitle}
          onChange={(event) =>
            onChange({ ...state, firstUpdateTitle: event.target.value })
          }
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          aria-invalid={Boolean(errors.firstUpdateTitle)}
        />
        {errors.firstUpdateTitle ? (
          <p className="text-xs text-red-700">{errors.firstUpdateTitle}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="submission-update-body"
          className="text-sm font-medium text-neutral-800"
        >
          Update body (plain text)
        </label>
        <textarea
          id="submission-update-body"
          rows={6}
          value={state.firstUpdateBody}
          onChange={(event) =>
            onChange({ ...state, firstUpdateBody: event.target.value })
          }
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
