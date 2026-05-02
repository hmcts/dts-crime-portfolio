"use client";

import { RadioGroup } from "./RadioGroup";
import type {
  EthicsStatus,
  GovernanceStatus,
  RiskRegisterStatus,
  SubmissionFormState,
} from "./types";

interface GovernanceSectionProps {
  state: SubmissionFormState;
  onChange: (next: SubmissionFormState) => void;
}

const RISK_OPTIONS: ReadonlyArray<{ value: RiskRegisterStatus; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Unknown" },
];

const ASSURANCE_OPTIONS: ReadonlyArray<{ value: GovernanceStatus; label: string }> =
  [
    { value: "complete", label: "Complete" },
    { value: "in-progress", label: "In progress" },
    { value: "not-required", label: "Not required" },
    { value: "missing", label: "Missing" },
  ];

const ETHICS_OPTIONS: ReadonlyArray<{ value: EthicsStatus; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "in-progress", label: "In progress" },
  { value: "unknown", label: "Unknown" },
];

/**
 * Section 5 — governance metadata: governance body free text plus four
 * status enums (risk register, DPIA, ATRS, MoJ ethics framework). Also
 * captures the operational survey detail fields (supplier, user count,
 * funding, PII flag).
 */
export function GovernanceSection({ state, onChange }: GovernanceSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="submission-governance-body"
          className="text-sm font-medium text-neutral-800"
        >
          Governance body
        </label>
        <input
          id="submission-governance-body"
          type="text"
          value={state.governanceBody}
          placeholder="e.g. EM Delivery Board"
          onChange={(event) =>
            onChange({ ...state, governanceBody: event.target.value })
          }
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <RadioGroup<RiskRegisterStatus>
        name="submission-risk-register"
        legend="Risk register"
        options={RISK_OPTIONS}
        value={state.riskRegister === "" ? null : state.riskRegister}
        onChange={(value) => onChange({ ...state, riskRegister: value })}
      />

      <RadioGroup<GovernanceStatus>
        name="submission-dpia"
        legend="DPIA in place"
        options={ASSURANCE_OPTIONS}
        value={state.dpiaInPlace === "" ? null : state.dpiaInPlace}
        onChange={(value) => onChange({ ...state, dpiaInPlace: value })}
      />

      <RadioGroup<GovernanceStatus>
        name="submission-acts"
        legend="ATRS in place"
        options={ASSURANCE_OPTIONS}
        value={state.actsInPlace === "" ? null : state.actsInPlace}
        onChange={(value) => onChange({ ...state, actsInPlace: value })}
      />

      <RadioGroup<EthicsStatus>
        name="submission-ethics"
        legend="MoJ ethics framework use"
        options={ETHICS_OPTIONS}
        value={
          state.mojEthicsFrameworkUse === "" ? null : state.mojEthicsFrameworkUse
        }
        onChange={(value) =>
          onChange({ ...state, mojEthicsFrameworkUse: value })
        }
      />

      <fieldset className="flex flex-col gap-4 rounded-md border border-neutral-200 p-3">
        <legend className="px-1 text-sm font-medium text-neutral-800">
          Operational details
        </legend>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="submission-supplier"
            className="text-xs font-medium text-neutral-700"
          >
            Supplier
          </label>
          <input
            id="submission-supplier"
            type="text"
            value={state.surveySupplier}
            onChange={(event) =>
              onChange({ ...state, surveySupplier: event.target.value })
            }
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="submission-user-count"
            className="text-xs font-medium text-neutral-700"
          >
            User count (estimate at scale)
          </label>
          <input
            id="submission-user-count"
            type="number"
            min={0}
            value={state.surveyUserCount}
            onChange={(event) =>
              onChange({ ...state, surveyUserCount: event.target.value })
            }
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="submission-funding"
            className="text-xs font-medium text-neutral-700"
          >
            Funding
          </label>
          <input
            id="submission-funding"
            type="text"
            value={state.surveyFunding}
            onChange={(event) =>
              onChange({ ...state, surveyFunding: event.target.value })
            }
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <RadioGroup<"yes" | "no">
          name="submission-pii"
          legend="Contains PII"
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          value={
            state.surveyContainsPii === "" ? null : state.surveyContainsPii
          }
          onChange={(value) => onChange({ ...state, surveyContainsPii: value })}
        />
      </fieldset>
    </div>
  );
}
