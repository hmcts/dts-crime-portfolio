"use client";

import { STAGES, STAGE_LABELS, type Stage } from "@/lib/enums/stage";

import { RadioGroup } from "./RadioGroup";
import type { SectionErrors } from "./validation";
import type { SubmissionFormState } from "./types";

interface BasicsSectionProps {
  state: SubmissionFormState;
  errors: SectionErrors;
  onChange: (next: SubmissionFormState) => void;
}

/**
 * Section 2 — project basics: name, description, and stage radio.
 */
export function BasicsSection({ state, errors, onChange }: BasicsSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="submission-name" className="text-sm font-medium text-neutral-800">
          Project name <span className="ml-1 text-red-600">*</span>
        </label>
        <input
          id="submission-name"
          type="text"
          value={state.name}
          onChange={(event) => onChange({ ...state, name: event.target.value })}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <p className="text-xs text-red-700">{errors.name}</p> : null}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="submission-description"
          className="text-sm font-medium text-neutral-800"
        >
          Description
        </label>
        <textarea
          id="submission-description"
          rows={4}
          value={state.description}
          onChange={(event) => onChange({ ...state, description: event.target.value })}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <RadioGroup<Stage>
        name="submission-stage"
        legend="Project stage"
        required
        options={STAGES.map((value) => ({ value, label: STAGE_LABELS[value] }))}
        value={state.projectStage === "" ? null : state.projectStage}
        error={errors.projectStage}
        onChange={(value) => onChange({ ...state, projectStage: value })}
      />
    </div>
  );
}
