"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { STAGES, STAGE_LABELS, type Stage } from "@/lib/enums/stage";
import type { Tier } from "@/lib/enums/tier";
import { tierLabel } from "@/lib/enums/tier";
import {
  TIERING_QUESTIONS,
  calculateTier,
  type TieringQuestion,
} from "@/lib/tiering/calculator";
import { TIERING_QUESTION_DEFS } from "@/lib/submission/tieringQuestions";
import type {
  PersonRefSelection,
  RefSelection,
  SubmissionRequestBody,
  SubmissionSurveyDetails,
} from "@/lib/submission/types";
import type { ReferenceData } from "@/lib/portfolio/referenceData";

import { SearchableSelect } from "./SearchableSelect";
import { MultiSelect } from "./MultiSelect";

const SECTION_TITLES = [
  "Tiering questions",
  "Project basics",
  "Ownership",
  "Capability",
  "Governance",
  "Updates",
] as const;

type SectionIndex = 0 | 1 | 2 | 3 | 4 | 5;

type Answers = Partial<Record<TieringQuestion, Tier>>;

interface RefField {
  id: string | null;
  newName: string | null;
}

interface PersonField {
  id: string | null;
  newPersonName: string | null;
  newPersonEmail: string | null;
}

const emptyRef = (): RefField => ({ id: null, newName: null });
const emptyPerson = (): PersonField => ({ id: null, newPersonName: null, newPersonEmail: null });

interface FormState {
  // Section 2
  name: string;
  description: string;
  projectStage: Stage | "";
  // Section 3
  group: RefField;
  directorate: RefField;
  businessAreaIds: string[];
  deliveryOwner: PersonField;
  businessLeadId: string | null;
  legalLeadId: string | null;
  // Section 4
  capability: RefField;
  additionalCapabilityIds: string[];
  actionPlanLinkIds: string[];
  // Section 5
  surveyDetails: {
    supplier: string;
    userCount: string;
    funding: string;
    containsPii: "yes" | "no" | "";
    sourceIdeaRef: string;
  };
  // Section 6
  firstUpdateTitle: string;
  firstUpdateBody: string;
}

function initialState(): FormState {
  return {
    name: "",
    description: "",
    projectStage: "",
    group: emptyRef(),
    directorate: emptyRef(),
    businessAreaIds: [],
    deliveryOwner: emptyPerson(),
    businessLeadId: null,
    legalLeadId: null,
    capability: emptyRef(),
    additionalCapabilityIds: [],
    actionPlanLinkIds: [],
    surveyDetails: {
      supplier: "",
      userCount: "",
      funding: "",
      containsPii: "",
      sourceIdeaRef: "",
    },
    firstUpdateTitle: "",
    firstUpdateBody: "",
  };
}

function refToSelection(field: RefField): RefSelection | null {
  if (field.id) return { id: field.id };
  if (field.newName) return { newName: field.newName };
  return null;
}

function personToSelection(field: PersonField): PersonRefSelection | null {
  if (field.id) return { id: field.id };
  if (field.newPersonName && field.newPersonEmail) {
    return { newPerson: { name: field.newPersonName, email: field.newPersonEmail } };
  }
  return null;
}

interface SubmissionFormProps {
  referenceData: ReferenceData;
}

export function SubmissionForm({ referenceData }: SubmissionFormProps) {
  const router = useRouter();
  const [section, setSection] = useState<SectionIndex>(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [form, setForm] = useState<FormState>(initialState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const computedTier = useMemo(() => calculateTier(answers), [answers]);

  const groupOptions = useMemo(
    () => referenceData.groups.map((g) => ({ value: g._id, label: g.name })),
    [referenceData.groups],
  );
  const directorateOptions = useMemo(() => {
    const filterByGroup = form.group.id;
    return referenceData.directorates
      .filter((d) => (filterByGroup ? d.group?._id === filterByGroup : true))
      .map((d) => ({
        value: d._id,
        label: d.group ? `${d.name} (${d.group.name})` : d.name,
      }));
  }, [referenceData.directorates, form.group.id]);
  const businessAreaOptions = useMemo(
    () => referenceData.businessAreas.map((b) => ({ value: b._id, label: b.name })),
    [referenceData.businessAreas],
  );
  const peopleOptions = useMemo(
    () => referenceData.people.map((p) => ({ value: p._id, label: `${p.name} (${p.email})` })),
    [referenceData.people],
  );
  const capabilityOptions = useMemo(
    () => referenceData.capabilities.map((c) => ({ value: c._id, label: c.name })),
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

  function validateSection(target: SectionIndex): Record<string, string> {
    const errs: Record<string, string> = {};
    if (target === 0) {
      for (const q of TIERING_QUESTIONS) {
        if (answers[q] === undefined) {
          errs[`tiering.${q}`] = "Required";
        }
      }
    }
    if (target === 1) {
      if (form.name.trim().length === 0) errs.name = "Required";
      if (!form.projectStage) errs.projectStage = "Required";
    }
    if (target === 2) {
      if (!refToSelection(form.group)) errs.group = "Required";
      if (!refToSelection(form.directorate)) errs.directorate = "Required";
      if (form.businessAreaIds.length === 0) errs.businessAreaIds = "Pick at least one";
      const owner = personToSelection(form.deliveryOwner);
      if (!owner) {
        errs.deliveryOwner = "Required";
      }
      if (form.deliveryOwner.newPersonName && !form.deliveryOwner.newPersonEmail) {
        errs["deliveryOwner.email"] = "Email required for new person";
      }
    }
    if (target === 3) {
      if (!refToSelection(form.capability)) errs.capability = "Required";
    }
    return errs;
  }

  function tryAdvance() {
    const errs = validateSection(section);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSection((s) => Math.min(5, (s + 1) as SectionIndex) as SectionIndex);
  }

  function goBack() {
    setErrors({});
    setSection((s) => Math.max(0, s - 1) as SectionIndex);
  }

  async function submit() {
    if (computedTier === null) {
      setServerError("Tiering assessment incomplete.");
      setSection(0);
      return;
    }
    const groupSel = refToSelection(form.group);
    const directorateSel = refToSelection(form.directorate);
    const capabilitySel = refToSelection(form.capability);
    const ownerSel = personToSelection(form.deliveryOwner);
    if (!groupSel || !directorateSel || !capabilitySel || !ownerSel || !form.projectStage) {
      setServerError("Some required fields are missing.");
      return;
    }

    const surveyDetails: SubmissionSurveyDetails = {};
    if (form.surveyDetails.supplier.trim()) surveyDetails.supplier = form.surveyDetails.supplier.trim();
    if (form.surveyDetails.userCount.trim()) {
      const n = Number(form.surveyDetails.userCount);
      if (Number.isFinite(n)) surveyDetails.userCount = n;
    }
    if (form.surveyDetails.funding.trim()) surveyDetails.funding = form.surveyDetails.funding.trim();
    if (form.surveyDetails.containsPii) surveyDetails.containsPii = form.surveyDetails.containsPii === "yes";
    if (form.surveyDetails.sourceIdeaRef.trim()) surveyDetails.sourceIdeaRef = form.surveyDetails.sourceIdeaRef.trim();

    const body: SubmissionRequestBody = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      projectStage: form.projectStage,
      group: groupSel,
      directorate: directorateSel,
      businessAreaIds: form.businessAreaIds,
      deliveryOwner: ownerSel,
      businessLeadId: form.businessLeadId ?? undefined,
      legalLeadId: form.legalLeadId ?? undefined,
      capability: capabilitySel,
      additionalCapabilityIds: form.additionalCapabilityIds,
      actionPlanLinkIds: form.actionPlanLinkIds,
      tieringAssessment: { ...answers },
      surveyDetails: Object.keys(surveyDetails).length > 0 ? surveyDetails : undefined,
      declaredOverallTier: computedTier,
      firstUpdate:
        form.firstUpdateTitle.trim().length > 0
          ? { title: form.firstUpdateTitle.trim(), body: form.firstUpdateBody }
          : undefined,
    };

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/portfolios/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(json.error ?? `Submission failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      const json = (await res.json()) as { ok: true; projectId: string };
      router.push(`/portfolio/${json.projectId}`);
    } catch (cause) {
      setServerError(cause instanceof Error ? cause.message : "Submission failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <ProgressBar current={section} />

      {section === 0 ? (
        <SectionTiering
          answers={answers}
          setAnswers={setAnswers}
          computedTier={computedTier}
          errors={errors}
        />
      ) : null}

      {section === 1 ? (
        <SectionBasics form={form} setForm={setForm} errors={errors} />
      ) : null}

      {section === 2 ? (
        <SectionOwnership
          form={form}
          setForm={setForm}
          errors={errors}
          groupOptions={groupOptions}
          directorateOptions={directorateOptions}
          businessAreaOptions={businessAreaOptions}
          peopleOptions={peopleOptions}
        />
      ) : null}

      {section === 3 ? (
        <SectionCapability
          form={form}
          setForm={setForm}
          errors={errors}
          capabilityOptions={capabilityOptions}
        />
      ) : null}

      {section === 4 ? (
        <SectionGovernance
          form={form}
          setForm={setForm}
          actionOptions={actionOptions}
        />
      ) : null}

      {section === 5 ? (
        <SectionUpdatesAndReview
          form={form}
          setForm={setForm}
          answers={answers}
          computedTier={computedTier}
          referenceData={referenceData}
          serverError={serverError}
          submitting={submitting}
          onSubmit={submit}
        />
      ) : null}

      <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={section === 0 || submitting}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-50"
        >
          Back
        </button>
        {section < 5 ? (
          <button
            type="button"
            onClick={tryAdvance}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Next: {SECTION_TITLES[section + 1]}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProgressBar({ current }: { current: SectionIndex }) {
  const pct = ((current + 1) / SECTION_TITLES.length) * 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <span>
          Section {current + 1} of {SECTION_TITLES.length}: {SECTION_TITLES[current]}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full bg-blue-600 transition-[width]"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={SECTION_TITLES.length}
        />
      </div>
    </div>
  );
}

function ExemptionBanner({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Do you need to complete this survey?</p>
      <p className="mt-1">
        You do <strong>not</strong> need to submit if your AI use is limited to:
      </p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5">
        <li>Microsoft Copilot or ChatGPT used without any PII or case data,</li>
        <li>Personal productivity that does not influence frontline justice work,</li>
        <li>Use that does not feed into automated decisions affecting individuals.</li>
      </ul>
      <button
        type="button"
        onClick={onSkip}
        className="mt-3 text-xs font-medium text-amber-900 underline underline-offset-2"
      >
        Skip — my use is exempt
      </button>
    </div>
  );
}

function SectionTiering({
  answers,
  setAnswers,
  computedTier,
  errors,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  computedTier: Tier | null;
  errors: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <section className="flex flex-col gap-4">
      <ExemptionBanner onSkip={() => router.push("/portfolio")} />
      <header className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div>
          <h2 className="text-lg font-semibold">Tiering questions</h2>
          <p className="text-xs text-neutral-600">
            Each answer maps to Tier 1 (low), Tier 2 (medium), or Tier 3 (high). Overall tier is the highest selected.
          </p>
        </div>
        <div className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm">
          Running tier: <span className="font-semibold">{tierLabel(computedTier)}</span>
        </div>
      </header>
      <ol className="flex flex-col gap-4">
        {TIERING_QUESTION_DEFS.map((q, idx) => (
          <li key={q.key} className="rounded-md border border-neutral-200 p-3">
            <p className="text-sm font-medium">
              {idx + 1}. {q.title}
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {q.options.map((opt) => {
                const checked = answers[q.key] === opt.tier;
                return (
                  <label
                    key={opt.tier}
                    className={`flex cursor-pointer items-start gap-2 rounded border p-2 text-sm ${
                      checked ? "border-blue-500 bg-blue-50" : "border-neutral-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`tiering-${q.key}`}
                      checked={checked}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.key]: opt.tier }))}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Tier {opt.tier}</span>
                      <span className="ml-2 text-neutral-700">{opt.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors[`tiering.${q.key}`] ? (
              <p className="mt-1 text-xs text-red-700">{errors[`tiering.${q.key}`]}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SectionBasics({
  form,
  setForm,
  errors,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Project basics</h2>
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Project name <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <p className="text-xs text-red-700">{errors.name}</p> : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          Project stage <span className="text-red-600">*</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage) => (
            <label
              key={stage}
              className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm ${
                form.projectStage === stage ? "border-blue-500 bg-blue-50" : "border-neutral-200"
              }`}
            >
              <input
                type="radio"
                name="projectStage"
                checked={form.projectStage === stage}
                onChange={() => setForm({ ...form, projectStage: stage })}
              />
              <span>{STAGE_LABELS[stage]}</span>
            </label>
          ))}
        </div>
        {errors.projectStage ? (
          <p className="text-xs text-red-700">{errors.projectStage}</p>
        ) : null}
      </div>
    </section>
  );
}

function SectionOwnership({
  form,
  setForm,
  errors,
  groupOptions,
  directorateOptions,
  businessAreaOptions,
  peopleOptions,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  groupOptions: { value: string; label: string }[];
  directorateOptions: { value: string; label: string }[];
  businessAreaOptions: { value: string; label: string }[];
  peopleOptions: { value: string; label: string }[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Ownership</h2>

      <SearchableSelect
        id="group"
        label="Group"
        required
        options={groupOptions}
        selectedId={form.group.id}
        newName={form.group.newName}
        onSelect={(id) => setForm({ ...form, group: { id, newName: null } })}
        onCreate={(name) => setForm({ ...form, group: { id: null, newName: name } })}
        onClear={() => setForm({ ...form, group: emptyRef() })}
        error={errors.group}
      />

      <SearchableSelect
        id="directorate"
        label="Directorate"
        required
        options={directorateOptions}
        selectedId={form.directorate.id}
        newName={form.directorate.newName}
        onSelect={(id) => setForm({ ...form, directorate: { id, newName: null } })}
        onCreate={(name) => setForm({ ...form, directorate: { id: null, newName: name } })}
        onClear={() => setForm({ ...form, directorate: emptyRef() })}
        error={errors.directorate}
      />

      <MultiSelect
        id="businessAreas"
        label="Business areas"
        required
        options={businessAreaOptions}
        selectedIds={form.businessAreaIds}
        onChange={(ids) => setForm({ ...form, businessAreaIds: ids })}
        error={errors.businessAreaIds}
      />

      <PersonField
        id="deliveryOwner"
        label="Delivery owner"
        required
        peopleOptions={peopleOptions}
        value={form.deliveryOwner}
        onChange={(next) => setForm({ ...form, deliveryOwner: next })}
        error={errors.deliveryOwner}
        emailError={errors["deliveryOwner.email"]}
      />

      <SearchableSelect
        id="businessLead"
        label="Business lead"
        allowCreate={false}
        options={peopleOptions}
        selectedId={form.businessLeadId}
        newName={null}
        onSelect={(id) => setForm({ ...form, businessLeadId: id })}
        onCreate={() => undefined}
        onClear={() => setForm({ ...form, businessLeadId: null })}
      />

      <SearchableSelect
        id="legalLead"
        label="Legal lead"
        allowCreate={false}
        options={peopleOptions}
        selectedId={form.legalLeadId}
        newName={null}
        onSelect={(id) => setForm({ ...form, legalLeadId: id })}
        onCreate={() => undefined}
        onClear={() => setForm({ ...form, legalLeadId: null })}
      />
    </section>
  );
}

function PersonField({
  id,
  label,
  required,
  peopleOptions,
  value,
  onChange,
  error,
  emailError,
}: {
  id: string;
  label: string;
  required?: boolean;
  peopleOptions: { value: string; label: string }[];
  value: PersonField;
  onChange: (next: PersonField) => void;
  error?: string;
  emailError?: string;
}) {
  if (value.newPersonName !== null) {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-email`} className="text-sm font-medium">
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm">
            Creating new person:{" "}
            <span className="font-medium">{value.newPersonName}</span>{" "}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
              pending review
            </span>
          </p>
          <input
            id={`${id}-email`}
            type="email"
            placeholder="email@hmcts.net"
            value={value.newPersonEmail ?? ""}
            onChange={(e) => onChange({ ...value, newPersonEmail: e.target.value })}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          {emailError ? <p className="mt-1 text-xs text-red-700">{emailError}</p> : null}
          <button
            type="button"
            onClick={() => onChange(emptyPerson())}
            className="mt-2 text-xs text-blue-700 underline"
          >
            Cancel — pick existing person
          </button>
        </div>
      </div>
    );
  }
  return (
    <SearchableSelect
      id={id}
      label={label}
      required={required}
      options={peopleOptions}
      selectedId={value.id}
      newName={null}
      onSelect={(idVal) => onChange({ id: idVal, newPersonName: null, newPersonEmail: null })}
      onCreate={(name) => onChange({ id: null, newPersonName: name, newPersonEmail: "" })}
      onClear={() => onChange(emptyPerson())}
      error={error}
    />
  );
}

function SectionCapability({
  form,
  setForm,
  errors,
  capabilityOptions,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  capabilityOptions: { value: string; label: string }[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Capability</h2>
      <SearchableSelect
        id="capability"
        label="Primary capability"
        required
        options={capabilityOptions}
        selectedId={form.capability.id}
        newName={form.capability.newName}
        onSelect={(id) => setForm({ ...form, capability: { id, newName: null } })}
        onCreate={(name) => setForm({ ...form, capability: { id: null, newName: name } })}
        onClear={() => setForm({ ...form, capability: emptyRef() })}
        error={errors.capability}
      />
      <MultiSelect
        id="additionalCapabilities"
        label="Additional capabilities"
        options={capabilityOptions}
        selectedIds={form.additionalCapabilityIds}
        onChange={(ids) => setForm({ ...form, additionalCapabilityIds: ids })}
      />
    </section>
  );
}

function SectionGovernance({
  form,
  setForm,
  actionOptions,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  actionOptions: { value: string; label: string }[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Governance</h2>
      <MultiSelect
        id="actionPlanLinks"
        label="Linked action plan items"
        options={actionOptions}
        selectedIds={form.actionPlanLinkIds}
        onChange={(ids) => setForm({ ...form, actionPlanLinkIds: ids })}
      />
      <fieldset className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium">Survey details</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Supplier</span>
            <input
              type="text"
              value={form.surveyDetails.supplier}
              onChange={(e) =>
                setForm({
                  ...form,
                  surveyDetails: { ...form.surveyDetails, supplier: e.target.value },
                })
              }
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>User count (estimate)</span>
            <input
              type="number"
              min={0}
              value={form.surveyDetails.userCount}
              onChange={(e) =>
                setForm({
                  ...form,
                  surveyDetails: { ...form.surveyDetails, userCount: e.target.value },
                })
              }
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Funding</span>
            <input
              type="text"
              value={form.surveyDetails.funding}
              onChange={(e) =>
                setForm({
                  ...form,
                  surveyDetails: { ...form.surveyDetails, funding: e.target.value },
                })
              }
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Source idea reference</span>
            <input
              type="text"
              value={form.surveyDetails.sourceIdeaRef}
              onChange={(e) =>
                setForm({
                  ...form,
                  surveyDetails: { ...form.surveyDetails, sourceIdeaRef: e.target.value },
                })
              }
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <span>Contains PII?</span>
          <div className="flex gap-3">
            {(["yes", "no"] as const).map((opt) => (
              <label key={opt} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="containsPii"
                  checked={form.surveyDetails.containsPii === opt}
                  onChange={() =>
                    setForm({
                      ...form,
                      surveyDetails: { ...form.surveyDetails, containsPii: opt },
                    })
                  }
                />
                <span className="capitalize">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>
    </section>
  );
}

function SectionUpdatesAndReview({
  form,
  setForm,
  answers,
  computedTier,
  referenceData,
  serverError,
  submitting,
  onSubmit,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  answers: Answers;
  computedTier: Tier | null;
  referenceData: ReferenceData;
  serverError: string | null;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const groupLabel =
    form.group.newName ??
    referenceData.groups.find((g) => g._id === form.group.id)?.name ??
    "—";
  const directorateLabel =
    form.directorate.newName ??
    referenceData.directorates.find((d) => d._id === form.directorate.id)?.name ??
    "—";
  const capabilityLabel =
    form.capability.newName ??
    referenceData.capabilities.find((c) => c._id === form.capability.id)?.name ??
    "—";
  const ownerLabel = form.deliveryOwner.newPersonName
    ? `${form.deliveryOwner.newPersonName} (new)`
    : referenceData.people.find((p) => p._id === form.deliveryOwner.id)?.name ?? "—";
  const businessAreas = form.businessAreaIds
    .map((id) => referenceData.businessAreas.find((b) => b._id === id)?.name ?? id)
    .join(", ");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">First update & review</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="firstUpdateTitle" className="text-sm font-medium">
          First update — title (optional)
        </label>
        <input
          id="firstUpdateTitle"
          type="text"
          value={form.firstUpdateTitle}
          onChange={(e) => setForm({ ...form, firstUpdateTitle: e.target.value })}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <label htmlFor="firstUpdateBody" className="text-sm font-medium">
          First update — body
        </label>
        <textarea
          id="firstUpdateBody"
          rows={3}
          value={form.firstUpdateBody}
          onChange={(e) => setForm({ ...form, firstUpdateBody: e.target.value })}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="text-sm font-semibold">Review</h3>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <ReviewRow term="Name" desc={form.name || "—"} />
          <ReviewRow term="Stage" desc={form.projectStage || "—"} />
          <ReviewRow term="Description" desc={form.description || "—"} />
          <ReviewRow term="Group" desc={groupLabel} />
          <ReviewRow term="Directorate" desc={directorateLabel} />
          <ReviewRow term="Business areas" desc={businessAreas || "—"} />
          <ReviewRow term="Delivery owner" desc={ownerLabel} />
          <ReviewRow term="Capability" desc={capabilityLabel} />
          <ReviewRow term="Action plan links" desc={String(form.actionPlanLinkIds.length)} />
          <ReviewRow term="Tiering answers" desc={`${Object.keys(answers).length} of 10`} />
          <ReviewRow term="Computed governance tier" desc={tierLabel(computedTier)} />
        </dl>
      </div>

      {serverError ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || computedTier === null}
        className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </section>
  );
}

function ReviewRow({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{term}</dt>
      <dd className="text-neutral-900">{desc}</dd>
    </div>
  );
}
