"use client";

import { TIERING_QUESTION_DEFS } from "@/lib/submission/tieringQuestions";
import type { Tier } from "@/lib/enums/tier";
import { tierLabel } from "@/lib/enums/tier";
import { calculateTier } from "@/lib/tiering/calculator";

import { ExemptionBanner } from "./ExemptionBanner";
import { RadioGroup } from "./RadioGroup";
import type { SectionErrors } from "./validation";
import type { SubmissionFormState } from "./types";

interface TieringSectionProps {
  state: SubmissionFormState;
  errors: SectionErrors;
  onChange: (next: SubmissionFormState) => void;
}

/**
 * Section 1 — 10-question tiering assessment.
 *
 * Spec: openspec/specs/project-submission/spec.md (10-question tiering
 * assessment, real-time tier display). Each answer maps to Tier 1, 2 or 3;
 * the running tier is the maximum of all answered values and is displayed
 * in the section header so the user sees their tier change as they answer.
 */
export function TieringSection({ state, errors, onChange }: TieringSectionProps) {
  const runningTier = calculateTier(state.tieringAnswers);

  return (
    <div className="flex flex-col gap-6">
      <ExemptionBanner />
      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Running tier
        </p>
        <p className="mt-1 text-lg font-semibold text-neutral-900">
          {tierLabel(runningTier)}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          The overall governance tier is the maximum of your 10 answers.
        </p>
      </div>
      <ol className="flex flex-col gap-6">
        {TIERING_QUESTION_DEFS.map((def, index) => (
          <li key={def.key}>
            <RadioGroup<Tier>
              name={`tiering-${def.key}`}
              legend={`${index + 1}. ${def.title}`}
              required
              options={def.options.map((opt) => ({
                value: opt.tier,
                label: `Tier ${opt.tier}`,
                hint: opt.label,
              }))}
              value={state.tieringAnswers[def.key] ?? null}
              error={errors[`tiering.${def.key}`]}
              onChange={(value) =>
                onChange({
                  ...state,
                  tieringAnswers: { ...state.tieringAnswers, [def.key]: value },
                })
              }
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
