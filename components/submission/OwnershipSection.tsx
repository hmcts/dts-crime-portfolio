"use client";

import { useMemo } from "react";

import type { ReferenceData } from "@/lib/portfolio/referenceData";

import { MultiSelectChips } from "./MultiSelectChips";
import { SearchableSelect } from "./SearchableSelect";
import type { SectionErrors } from "./validation";
import { isValidEmail } from "./validation";
import type { SubmissionFormState } from "./types";

interface OwnershipSectionProps {
  state: SubmissionFormState;
  errors: SectionErrors;
  referenceData: ReferenceData;
  onChange: (next: SubmissionFormState) => void;
}

/**
 * Section 3 — ownership: group, directorate, business areas, delivery
 * owner (with inline-create), business lead, legal lead.
 *
 * Group and directorate are paired: when a group is chosen, the directorate
 * dropdown narrows to directorates within that group.
 */
export function OwnershipSection({
  state,
  errors,
  referenceData,
  onChange,
}: OwnershipSectionProps) {
  const groupOptions = useMemo(
    () => referenceData.groups.map((g) => ({ value: g._id, label: g.name })),
    [referenceData.groups],
  );
  const directorateOptions = useMemo(() => {
    const groupId = state.group.id;
    return referenceData.directorates
      .filter((d) => (groupId ? d.group?._id === groupId : true))
      .map((d) => ({ value: d._id, label: d.name }));
  }, [referenceData.directorates, state.group.id]);
  const businessAreaOptions = useMemo(
    () =>
      referenceData.businessAreas.map((ba) => ({ value: ba._id, label: ba.name })),
    [referenceData.businessAreas],
  );
  const peopleOptions = useMemo(
    () => referenceData.people.map((p) => ({ value: p._id, label: p.name })),
    [referenceData.people],
  );

  const owner = state.deliveryOwner;

  return (
    <div className="flex flex-col gap-6">
      <SearchableSelect
        id="submission-group"
        label="Group"
        required
        options={groupOptions}
        selectedId={state.group.id}
        newName={state.group._new?.name ?? null}
        error={errors.group}
        onSelect={(id) =>
          onChange({
            ...state,
            group: { id },
            // Reset directorate when group changes — keeps the pairing valid.
            directorate: { id: null },
          })
        }
        onCreate={(name) =>
          onChange({
            ...state,
            group: { id: null, _new: { name } },
            directorate: { id: null },
          })
        }
        onClear={() =>
          onChange({ ...state, group: { id: null }, directorate: { id: null } })
        }
      />

      <SearchableSelect
        id="submission-directorate"
        label="Directorate"
        required
        options={directorateOptions}
        selectedId={state.directorate.id}
        newName={state.directorate._new?.name ?? null}
        error={errors.directorate}
        onSelect={(id) => onChange({ ...state, directorate: { id } })}
        onCreate={(name) =>
          onChange({ ...state, directorate: { id: null, _new: { name } } })
        }
        onClear={() => onChange({ ...state, directorate: { id: null } })}
      />

      <MultiSelectChips
        id="submission-business-areas"
        label="Business areas"
        options={businessAreaOptions}
        selected={state.businessAreaIds}
        onChange={(next) => onChange({ ...state, businessAreaIds: next })}
      />

      <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
        <p className="text-sm font-medium text-neutral-800">
          Delivery owner <span className="ml-1 text-red-600">*</span>
        </p>
        {owner._new ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-600">
              Creating a new person — will be marked pending review until an
              Admin approves.
            </p>
            <input
              type="text"
              placeholder="Full name"
              value={owner._new.name}
              onChange={(event) =>
                onChange({
                  ...state,
                  deliveryOwner: {
                    id: null,
                    _new: { name: event.target.value, email: owner._new!.email },
                  },
                })
              }
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              aria-invalid={Boolean(errors["deliveryOwner.name"])}
            />
            {errors["deliveryOwner.name"] ? (
              <p className="text-xs text-red-700">{errors["deliveryOwner.name"]}</p>
            ) : null}
            <input
              type="email"
              placeholder="Email address"
              value={owner._new.email}
              onChange={(event) =>
                onChange({
                  ...state,
                  deliveryOwner: {
                    id: null,
                    _new: { name: owner._new!.name, email: event.target.value },
                  },
                })
              }
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              aria-invalid={Boolean(errors["deliveryOwner.email"])}
            />
            {errors["deliveryOwner.email"] ? (
              <p className="text-xs text-red-700">{errors["deliveryOwner.email"]}</p>
            ) : owner._new.email.length > 0 && !isValidEmail(owner._new.email) ? (
              <p className="text-xs text-amber-700">Email looks invalid.</p>
            ) : null}
            <button
              type="button"
              onClick={() =>
                onChange({ ...state, deliveryOwner: { id: null } })
              }
              className="self-start text-xs text-blue-700 underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <SearchableSelect
            id="submission-delivery-owner"
            label=""
            required
            options={peopleOptions}
            selectedId={owner.id}
            newName={null}
            error={errors.deliveryOwner}
            onSelect={(id) =>
              onChange({ ...state, deliveryOwner: { id } })
            }
            onCreate={(name) =>
              onChange({
                ...state,
                deliveryOwner: { id: null, _new: { name, email: "" } },
              })
            }
            onClear={() => onChange({ ...state, deliveryOwner: { id: null } })}
          />
        )}
      </div>

      <SearchableSelect
        id="submission-business-lead"
        label="Business lead"
        allowCreate={false}
        options={peopleOptions}
        selectedId={state.businessLeadId === "" ? null : state.businessLeadId}
        newName={null}
        onSelect={(id) => onChange({ ...state, businessLeadId: id })}
        onCreate={() => undefined}
        onClear={() => onChange({ ...state, businessLeadId: "" })}
      />

      <SearchableSelect
        id="submission-legal-lead"
        label="Legal lead"
        allowCreate={false}
        options={peopleOptions}
        selectedId={state.legalLeadId === "" ? null : state.legalLeadId}
        newName={null}
        onSelect={(id) => onChange({ ...state, legalLeadId: id })}
        onCreate={() => undefined}
        onClear={() => onChange({ ...state, legalLeadId: "" })}
      />
    </div>
  );
}
