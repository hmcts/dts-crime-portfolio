"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const RISK_REGISTER_OPTIONS = ["yes", "no", "unknown"] as const;
const ASSURANCE_OPTIONS = ["complete", "in-progress", "not-required", "missing"] as const;
const ETHICS_OPTIONS = ["yes", "no", "in-progress", "unknown"] as const;

type RiskRegister = (typeof RISK_REGISTER_OPTIONS)[number];
type Assurance = (typeof ASSURANCE_OPTIONS)[number];
type Ethics = (typeof ETHICS_OPTIONS)[number];

interface DossierGovernanceEditorProps {
  projectId: string;
  initialGovernanceBody: string | null;
  initialRiskRegister: RiskRegister | null;
  initialDpiaInPlace: Assurance | null;
  initialActsInPlace: Assurance | null;
  initialMojEthicsFrameworkUse: Ethics | null;
  onClose: () => void;
}

/**
 * Inline editor for the dossier's governance and assurance row. Edits the
 * Sanity-managed fields (governanceBody, riskRegister, dpiaInPlace,
 * actsInPlace, mojEthicsFrameworkUse). Submits to PATCH /api/portfolios/[id].
 * `governanceTier` is read-only — it's derived from the tiering assessment.
 *
 * Spec: openspec/specs/edit-studio/spec.md.
 */
export function DossierGovernanceEditor({
  projectId,
  initialGovernanceBody,
  initialRiskRegister,
  initialDpiaInPlace,
  initialActsInPlace,
  initialMojEthicsFrameworkUse,
  onClose,
}: DossierGovernanceEditorProps) {
  const router = useRouter();
  const [governanceBody, setGovernanceBody] = useState<string>(initialGovernanceBody ?? "");
  const [riskRegister, setRiskRegister] = useState<RiskRegister | "">(initialRiskRegister ?? "");
  const [dpiaInPlace, setDpiaInPlace] = useState<Assurance | "">(initialDpiaInPlace ?? "");
  const [actsInPlace, setActsInPlace] = useState<Assurance | "">(initialActsInPlace ?? "");
  const [mojEthicsFrameworkUse, setMojEthicsFrameworkUse] = useState<Ethics | "">(
    initialMojEthicsFrameworkUse ?? "",
  );
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
        body: JSON.stringify({
          governanceBody: governanceBody.trim() === "" ? null : governanceBody,
          riskRegister: riskRegister === "" ? null : riskRegister,
          dpiaInPlace: dpiaInPlace === "" ? null : dpiaInPlace,
          actsInPlace: actsInPlace === "" ? null : actsInPlace,
          mojEthicsFrameworkUse: mojEthicsFrameworkUse === "" ? null : mojEthicsFrameworkUse,
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
      className="space-y-4 rounded-md border border-neutral-200 bg-white p-4"
      aria-label="Edit governance and assurance"
    >
      <div className="space-y-1">
        <label
          htmlFor={`governanceBody-${projectId}`}
          className="block text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Governance body
        </label>
        <input
          id={`governanceBody-${projectId}`}
          type="text"
          value={governanceBody}
          onChange={(event) => setGovernanceBody(event.target.value)}
          disabled={submitting}
          className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <SelectField
        id={`riskRegister-${projectId}`}
        label="Risk register"
        value={riskRegister}
        options={RISK_REGISTER_OPTIONS}
        disabled={submitting}
        onChange={(value) => setRiskRegister(value as RiskRegister | "")}
      />
      <SelectField
        id={`dpiaInPlace-${projectId}`}
        label="DPIA in place"
        value={dpiaInPlace}
        options={ASSURANCE_OPTIONS}
        disabled={submitting}
        onChange={(value) => setDpiaInPlace(value as Assurance | "")}
      />
      <SelectField
        id={`actsInPlace-${projectId}`}
        label="ATRS in place"
        value={actsInPlace}
        options={ASSURANCE_OPTIONS}
        disabled={submitting}
        onChange={(value) => setActsInPlace(value as Assurance | "")}
      />
      <SelectField
        id={`mojEthicsFrameworkUse-${projectId}`}
        label="Ethics framework use"
        value={mojEthicsFrameworkUse}
        options={ETHICS_OPTIONS}
        disabled={submitting}
        onChange={(value) => setMojEthicsFrameworkUse(value as Ethics | "")}
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

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  disabled: boolean;
  onChange: (value: string) => void;
}

function SelectField({ id, label, value, options, disabled, onChange }: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">— Not yet recorded —</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
