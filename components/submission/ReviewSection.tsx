"use client";

import type { ReferenceData } from "@/lib/portfolio/referenceData";
import { STAGE_LABELS } from "@/lib/enums/stage";
import { tierLabel } from "@/lib/enums/tier";
import { calculateTier } from "@/lib/tiering/calculator";
import { TIERING_QUESTION_DEFS } from "@/lib/submission/tieringQuestions";

import type { SubmissionFormState } from "./types";

interface ReviewSectionProps {
  state: SubmissionFormState;
  referenceData: ReferenceData;
}

/**
 * Final review screen — reads back every entered value and shows the
 * recomputed governance tier. The Submit button lives on the parent
 * form (alongside Back) so it can drive the POST request.
 *
 * Spec: openspec/specs/project-submission/spec.md (Final review with
 * recomputed tier).
 */
export function ReviewSection({ state, referenceData }: ReviewSectionProps) {
  const tier = calculateTier(state.tieringAnswers);

  const groupName = resolveRefName(state.group, referenceData.groups);
  const directorateName = resolveRefName(
    state.directorate,
    referenceData.directorates,
  );
  const businessAreaNames = state.businessAreaIds
    .map((id) => referenceData.businessAreas.find((ba) => ba._id === id)?.name)
    .filter(Boolean) as string[];
  const ownerName = state.deliveryOwner._new
    ? `${state.deliveryOwner._new.name} (new)`
    : referenceData.people.find((p) => p._id === state.deliveryOwner.id)?.name ??
      "—";
  const businessLeadName =
    referenceData.people.find((p) => p._id === state.businessLeadId)?.name ?? "—";
  const legalLeadName =
    referenceData.people.find((p) => p._id === state.legalLeadId)?.name ?? "—";
  const capabilityName = resolveRefName(state.capability, referenceData.capabilities);
  const additionalCapabilityNames = state.additionalCapabilityIds
    .map((id) => referenceData.capabilities.find((c) => c._id === id)?.name)
    .filter(Boolean) as string[];
  const actionLinks = state.actionPlanLinkIds
    .map((id) => referenceData.actions.find((a) => a._id === id))
    .filter(Boolean)
    .map((a) => `${a!.actionNo} — ${a!.name}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs uppercase tracking-wide text-blue-900">
          Governance tier (recomputed)
        </p>
        <p className="mt-1 text-lg font-semibold text-blue-900">
          {tierLabel(tier)}
        </p>
        <p className="mt-1 text-xs text-blue-900/80">
          The server will recompute this on submit and reject any mismatch.
        </p>
      </div>

      <ReviewBlock title="Tiering answers">
        <ul className="space-y-1 text-sm">
          {TIERING_QUESTION_DEFS.map((def) => {
            const answer = state.tieringAnswers[def.key];
            const optionLabel = answer
              ? def.options.find((opt) => opt.tier === answer)?.label
              : null;
            return (
              <li key={def.key} className="flex flex-col gap-0.5">
                <span className="text-xs text-neutral-500">{def.title}</span>
                <span className="text-neutral-800">
                  {answer
                    ? `Tier ${answer} — ${optionLabel}`
                    : "Not answered"}
                </span>
              </li>
            );
          })}
        </ul>
      </ReviewBlock>

      <ReviewBlock title="Project basics">
        <ReviewRow label="Name" value={state.name || "—"} />
        <ReviewRow label="Description" value={state.description || "—"} />
        <ReviewRow
          label="Stage"
          value={
            state.projectStage
              ? STAGE_LABELS[state.projectStage]
              : "—"
          }
        />
      </ReviewBlock>

      <ReviewBlock title="Ownership">
        <ReviewRow label="Group" value={groupName} />
        <ReviewRow label="Directorate" value={directorateName} />
        <ReviewRow
          label="Business areas"
          value={businessAreaNames.length > 0 ? businessAreaNames.join(", ") : "—"}
        />
        <ReviewRow
          label="Delivery owner"
          value={
            state.deliveryOwner._new
              ? `${state.deliveryOwner._new.name} <${state.deliveryOwner._new.email}> (new)`
              : ownerName
          }
        />
        <ReviewRow label="Business lead" value={businessLeadName} />
        <ReviewRow label="Legal lead" value={legalLeadName} />
      </ReviewBlock>

      <ReviewBlock title="Capability">
        <ReviewRow label="Primary capability" value={capabilityName} />
        <ReviewRow
          label="Additional capabilities"
          value={
            additionalCapabilityNames.length > 0
              ? additionalCapabilityNames.join(", ")
              : "—"
          }
        />
        <ReviewRow
          label="Action plan links"
          value={actionLinks.length > 0 ? actionLinks.join("; ") : "—"}
        />
      </ReviewBlock>

      <ReviewBlock title="Governance">
        <ReviewRow label="Governance body" value={state.governanceBody || "—"} />
        <ReviewRow label="Risk register" value={state.riskRegister || "—"} />
        <ReviewRow label="DPIA in place" value={state.dpiaInPlace || "—"} />
        <ReviewRow label="ATRS in place" value={state.actsInPlace || "—"} />
        <ReviewRow
          label="Ethics framework use"
          value={state.mojEthicsFrameworkUse || "—"}
        />
      </ReviewBlock>

      <ReviewBlock title="Operational">
        <ReviewRow label="Supplier" value={state.surveySupplier || "—"} />
        <ReviewRow label="User count" value={state.surveyUserCount || "—"} />
        <ReviewRow label="Funding" value={state.surveyFunding || "—"} />
        <ReviewRow
          label="Contains PII"
          value={state.surveyContainsPii || "—"}
        />
      </ReviewBlock>

      <ReviewBlock title="First update">
        <ReviewRow label="Title" value={state.firstUpdateTitle || "—"} />
        <ReviewRow label="Body" value={state.firstUpdateBody || "—"} />
      </ReviewBlock>
    </div>
  );
}

function ReviewBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
      <div className="mt-2 flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[160px_1fr]">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="whitespace-pre-wrap text-neutral-800">{value}</span>
    </div>
  );
}

function resolveRefName(
  ref: { id: string | null; _new?: { name: string } },
  rows: ReadonlyArray<{ _id: string; name: string }>,
): string {
  if (ref._new) return `${ref._new.name} (new)`;
  if (ref.id) return rows.find((row) => row._id === ref.id)?.name ?? "—";
  return "—";
}
