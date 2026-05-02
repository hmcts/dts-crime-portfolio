import type { Stage } from "@/lib/enums/stage";
import type { Tier } from "@/lib/enums/tier";
import type { TieringQuestion } from "@/lib/tiering/calculator";

/**
 * Client-side form state mirror of the SubmissionRequestBody. References
 * are tracked as either an `id` (existing entity) or `_new` (inline-create
 * pending review). Everything is held in client state and sent to
 * `/api/portfolios/submit` on submit.
 */
export interface RefValue {
  id: string | null;
  /** Marker for an inline-created entity. The server creates the document
   * with `pendingReview: true` in the same transaction as the project. */
  _new?: { name: string };
}

export interface PersonRefValue {
  id: string | null;
  _new?: { name: string; email: string };
}

export type GovernanceStatus = "complete" | "in-progress" | "not-required" | "missing";
export type RiskRegisterStatus = "yes" | "no" | "unknown";
export type EthicsStatus = "yes" | "no" | "in-progress" | "unknown";

export interface SubmissionFormState {
  // Section 1: tiering
  tieringAnswers: Partial<Record<TieringQuestion, Tier>>;

  // Section 2: basics
  name: string;
  description: string;
  projectStage: Stage | "";

  // Section 3: ownership
  group: RefValue;
  directorate: RefValue;
  businessAreaIds: string[];
  deliveryOwner: PersonRefValue;
  businessLeadId: string;
  legalLeadId: string;

  // Section 4: capability
  capability: RefValue;
  additionalCapabilityIds: string[];
  actionPlanLinkIds: string[];

  // Section 5: governance
  governanceBody: string;
  riskRegister: RiskRegisterStatus | "";
  dpiaInPlace: GovernanceStatus | "";
  actsInPlace: GovernanceStatus | "";
  mojEthicsFrameworkUse: EthicsStatus | "";

  // Section 5: survey details (operational)
  surveySupplier: string;
  surveyUserCount: string;
  surveyFunding: string;
  surveyContainsPii: "yes" | "no" | "";

  // Section 6: first update
  firstUpdateTitle: string;
  firstUpdateBody: string;
}

export const EMPTY_REF: RefValue = { id: null };
export const EMPTY_PERSON_REF: PersonRefValue = { id: null };

export function makeInitialState(): SubmissionFormState {
  return {
    tieringAnswers: {},
    name: "",
    description: "",
    projectStage: "",
    group: { id: null },
    directorate: { id: null },
    businessAreaIds: [],
    deliveryOwner: { id: null },
    businessLeadId: "",
    legalLeadId: "",
    capability: { id: null },
    additionalCapabilityIds: [],
    actionPlanLinkIds: [],
    governanceBody: "",
    riskRegister: "",
    dpiaInPlace: "",
    actsInPlace: "",
    mojEthicsFrameworkUse: "",
    surveySupplier: "",
    surveyUserCount: "",
    surveyFunding: "",
    surveyContainsPii: "",
    firstUpdateTitle: "",
    firstUpdateBody: "",
  };
}

export interface SectionDef {
  id: string;
  label: string;
}

export const SECTIONS: readonly SectionDef[] = [
  { id: "tiering", label: "Tiering questions" },
  { id: "basics", label: "Project basics" },
  { id: "ownership", label: "Ownership" },
  { id: "capability", label: "Capability" },
  { id: "governance", label: "Governance" },
  { id: "updates", label: "Updates" },
] as const;

/** Index of the final review screen that follows the six sections. */
export const REVIEW_INDEX = SECTIONS.length;
