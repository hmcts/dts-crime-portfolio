"use client";

import { useMemo } from "react";

import type { ReferenceData } from "@/lib/portfolio/referenceData";

import { MultiSelectChips } from "./MultiSelectChips";
import { SearchableSelect } from "./SearchableSelect";
import type { SectionErrors } from "./validation";
import type { SubmissionFormState } from "./types";

interface CapabilitySectionProps {
  state: SubmissionFormState;
  errors: SectionErrors;
  referenceData: ReferenceData;
  onChange: (next: SubmissionFormState) => void;
}

/**
 * Section 4 — capability and action plan links. Primary capability allows
 * inline-create; the additional-capabilities and action-plan-links lists
 * are constrained to existing reference rows.
 */
export function CapabilitySection({
  state,
  errors,
  referenceData,
  onChange,
}: CapabilitySectionProps) {
  const capabilityOptions = useMemo(
    () =>
      referenceData.capabilities.map((c) => ({ value: c._id, label: c.name })),
    [referenceData.capabilities],
  );
  const actionOptions = useMemo(
    () =>
      referenceData.actions.map((a) => ({
        value: a._id,
        label: `${a.actionNo} — ${a.name}`,
      })),
    [referenceData.actions],
  );

  return (
    <div className="flex flex-col gap-6">
      <SearchableSelect
        id="submission-capability"
        label="Primary capability"
        required
        options={capabilityOptions}
        selectedId={state.capability.id}
        newName={state.capability._new?.name ?? null}
        error={errors.capability}
        onSelect={(id) => onChange({ ...state, capability: { id } })}
        onCreate={(name) =>
          onChange({ ...state, capability: { id: null, _new: { name } } })
        }
        onClear={() => onChange({ ...state, capability: { id: null } })}
      />

      <MultiSelectChips
        id="submission-additional-capabilities"
        label="Additional capabilities"
        options={capabilityOptions.filter(
          (opt) => opt.value !== state.capability.id,
        )}
        selected={state.additionalCapabilityIds}
        onChange={(next) => onChange({ ...state, additionalCapabilityIds: next })}
      />

      <MultiSelectChips
        id="submission-action-plan-links"
        label="Action plan links"
        options={actionOptions}
        selected={state.actionPlanLinkIds}
        onChange={(next) => onChange({ ...state, actionPlanLinkIds: next })}
      />
    </div>
  );
}
