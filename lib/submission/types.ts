import type { Stage } from "@/lib/enums/stage";
import type { Tier } from "@/lib/enums/tier";
import type { TieringQuestion } from "@/lib/tiering/calculator";

/**
 * Wire shape for the submission API. Either an `id` string is supplied for
 * an existing reference document, or a `newName` (or `newPerson`) is
 * supplied to request inline creation of a `pendingReview: true` entity in
 * the same Sanity transaction. See
 * openspec/specs/project-submission/spec.md.
 */
export type RefSelection<NewShape = string> =
  | { id: string }
  | { newName: NewShape };

export interface SubmissionPersonNew {
  name: string;
  email: string;
}

export type PersonRefSelection =
  | { id: string }
  | { newPerson: SubmissionPersonNew };

export type SubmissionTieringAssessment = Partial<Record<TieringQuestion, Tier>>;

export interface SubmissionSurveyDetails {
  supplier?: string;
  userCount?: number;
  funding?: string;
  containsPii?: boolean;
  sourceIdeaRef?: string;
}

export interface SubmissionRequestBody {
  name: string;
  description?: string;
  projectStage: Stage;

  group: RefSelection;
  directorate: RefSelection;
  businessAreaIds: string[];

  deliveryOwner: PersonRefSelection;
  businessLeadId?: string;
  legalLeadId?: string;

  capability: RefSelection;
  additionalCapabilityIds: string[];

  actionPlanLinkIds: string[];

  tieringAssessment: SubmissionTieringAssessment;
  surveyDetails?: SubmissionSurveyDetails;

  declaredOverallTier: Tier;

  /** Optional first project update — title + plain text body. */
  firstUpdate?: { title: string; body: string };
}

export interface SubmissionSuccessResponse {
  ok: true;
  projectId: string;
}

export interface SubmissionErrorResponse {
  error: string;
  details?: Record<string, string>;
}
