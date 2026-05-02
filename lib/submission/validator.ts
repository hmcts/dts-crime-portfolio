import { isStage } from "@/lib/enums/stage";
import { isTier, type Tier } from "@/lib/enums/tier";
import {
  TIERING_QUESTIONS,
  calculateTier,
  type TieringQuestion,
} from "@/lib/tiering/calculator";

import type {
  PersonRefSelection,
  RefSelection,
  SubmissionRequestBody,
  SubmissionSurveyDetails,
  SubmissionTieringAssessment,
} from "./types";

export interface ValidationFailure {
  ok: false;
  error: string;
  details?: Record<string, string>;
}

export interface ValidationSuccess {
  ok: true;
  body: SubmissionRequestBody;
  computedTier: Tier;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// Non-ambiguous email shape. The previous form `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
// allowed `.` inside the second `[^\s@]+`, which made the split between the
// second and third segments ambiguous and produced polynomial backtracking
// on inputs like `!@!.!.!.` (CodeQL js/redos). The version below excludes
// `.` from the per-label segments so each label greedy-consumes everything
// up to the next `.` and the regex is linear-time.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function fail(error: string, details?: Record<string, string>): ValidationFailure {
  return { ok: false, error, details };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseRefSelection(
  raw: unknown,
  field: string,
  details: Record<string, string>,
): RefSelection | null {
  if (!isObject(raw)) {
    details[field] = "Required";
    return null;
  }
  if (typeof raw.id === "string" && raw.id.length > 0) {
    return { id: raw.id };
  }
  if (typeof raw.newName === "string" && raw.newName.trim().length > 0) {
    return { newName: raw.newName.trim() };
  }
  details[field] = "Must supply id or newName";
  return null;
}

function parsePersonRefSelection(
  raw: unknown,
  field: string,
  details: Record<string, string>,
): PersonRefSelection | null {
  if (!isObject(raw)) {
    details[field] = "Required";
    return null;
  }
  if (typeof raw.id === "string" && raw.id.length > 0) {
    return { id: raw.id };
  }
  if (isObject(raw.newPerson)) {
    const name = raw.newPerson.name;
    const email = raw.newPerson.email;
    if (typeof name !== "string" || name.trim().length === 0) {
      details[`${field}.newPerson.name`] = "Required";
      return null;
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      details[`${field}.newPerson.email`] = "Must be a valid email";
      return null;
    }
    return { newPerson: { name: name.trim(), email: email.trim().toLowerCase() } };
  }
  details[field] = "Must supply id or newPerson";
  return null;
}

function parseTieringAssessment(
  raw: unknown,
  details: Record<string, string>,
): SubmissionTieringAssessment | null {
  if (!isObject(raw)) {
    details["tieringAssessment"] = "Required";
    return null;
  }
  const out: SubmissionTieringAssessment = {};
  let answered = 0;
  for (const key of TIERING_QUESTIONS) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    if (!isTier(value)) {
      details[`tieringAssessment.${key}`] = "Must be 1, 2 or 3";
      return null;
    }
    out[key as TieringQuestion] = value;
    answered += 1;
  }
  if (answered !== TIERING_QUESTIONS.length) {
    details["tieringAssessment"] = "All 10 questions must be answered";
    return null;
  }
  return out;
}

function parseSurveyDetails(
  raw: unknown,
  details: Record<string, string>,
): SubmissionSurveyDetails | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isObject(raw)) {
    details["surveyDetails"] = "Must be an object";
    return undefined;
  }
  const out: SubmissionSurveyDetails = {};
  if (raw.supplier !== undefined) {
    if (typeof raw.supplier !== "string") {
      details["surveyDetails.supplier"] = "Must be a string";
      return undefined;
    }
    if (raw.supplier.trim().length > 0) out.supplier = raw.supplier.trim();
  }
  if (raw.userCount !== undefined && raw.userCount !== null && raw.userCount !== "") {
    const n =
      typeof raw.userCount === "number"
        ? raw.userCount
        : typeof raw.userCount === "string"
        ? Number(raw.userCount)
        : NaN;
    if (!Number.isFinite(n) || n < 0) {
      details["surveyDetails.userCount"] = "Must be a non-negative number";
      return undefined;
    }
    out.userCount = n;
  }
  if (raw.funding !== undefined) {
    if (typeof raw.funding !== "string") {
      details["surveyDetails.funding"] = "Must be a string";
      return undefined;
    }
    if (raw.funding.trim().length > 0) out.funding = raw.funding.trim();
  }
  if (raw.containsPii !== undefined && raw.containsPii !== null) {
    if (typeof raw.containsPii !== "boolean") {
      details["surveyDetails.containsPii"] = "Must be a boolean";
      return undefined;
    }
    out.containsPii = raw.containsPii;
  }
  if (raw.sourceIdeaRef !== undefined) {
    if (typeof raw.sourceIdeaRef !== "string") {
      details["surveyDetails.sourceIdeaRef"] = "Must be a string";
      return undefined;
    }
    if (raw.sourceIdeaRef.trim().length > 0) out.sourceIdeaRef = raw.sourceIdeaRef.trim();
  }
  return out;
}

function parseStringIdArray(
  raw: unknown,
  field: string,
  details: Record<string, string>,
): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    details[field] = "Must be an array";
    return null;
  }
  for (const entry of raw) {
    if (typeof entry !== "string" || entry.length === 0) {
      details[field] = "Must be an array of non-empty strings";
      return null;
    }
  }
  return raw as string[];
}

/**
 * Validate a `POST /api/portfolios/submit` request body and recompute the
 * overall tier server-side. Returns `{ ok: false, error, details }` for any
 * shape failure, or `{ ok: true, body, computedTier }` on success.
 *
 * Spec: openspec/specs/project-submission/spec.md (Final review with
 * recomputed tier).
 */
export function validateSubmission(input: unknown): ValidationResult {
  if (!isObject(input)) {
    return fail("Body must be an object");
  }

  const details: Record<string, string> = {};

  const name = input.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    details["name"] = "Required";
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : undefined;

  if (!isStage(input.projectStage)) {
    details["projectStage"] = "Must be a valid stage";
  }

  const group = parseRefSelection(input.group, "group", details);
  const directorate = parseRefSelection(input.directorate, "directorate", details);
  const businessAreaIds = parseStringIdArray(
    input.businessAreaIds,
    "businessAreaIds",
    details,
  );

  const deliveryOwner = parsePersonRefSelection(
    input.deliveryOwner,
    "deliveryOwner",
    details,
  );

  let businessLeadId: string | undefined;
  if (input.businessLeadId !== undefined && input.businessLeadId !== null && input.businessLeadId !== "") {
    if (typeof input.businessLeadId !== "string") {
      details["businessLeadId"] = "Must be a string";
    } else {
      businessLeadId = input.businessLeadId;
    }
  }
  let legalLeadId: string | undefined;
  if (input.legalLeadId !== undefined && input.legalLeadId !== null && input.legalLeadId !== "") {
    if (typeof input.legalLeadId !== "string") {
      details["legalLeadId"] = "Must be a string";
    } else {
      legalLeadId = input.legalLeadId;
    }
  }

  const capability = parseRefSelection(input.capability, "capability", details);
  const additionalCapabilityIds = parseStringIdArray(
    input.additionalCapabilityIds,
    "additionalCapabilityIds",
    details,
  );

  const actionPlanLinkIds = parseStringIdArray(
    input.actionPlanLinkIds,
    "actionPlanLinkIds",
    details,
  );

  const tieringAssessment = parseTieringAssessment(input.tieringAssessment, details);

  if (!isTier(input.declaredOverallTier)) {
    details["declaredOverallTier"] = "Must be 1, 2 or 3";
  }

  const surveyDetails = parseSurveyDetails(input.surveyDetails, details);

  let firstUpdate: SubmissionRequestBody["firstUpdate"];
  if (input.firstUpdate !== undefined && input.firstUpdate !== null) {
    if (!isObject(input.firstUpdate)) {
      details["firstUpdate"] = "Must be an object";
    } else if (
      isNonEmptyString(input.firstUpdate.title) ||
      isNonEmptyString(input.firstUpdate.body)
    ) {
      const title = isNonEmptyString(input.firstUpdate.title)
        ? input.firstUpdate.title.trim()
        : "";
      const body = typeof input.firstUpdate.body === "string"
        ? input.firstUpdate.body
        : "";
      if (title.length === 0) {
        details["firstUpdate.title"] = "Required when firstUpdate is supplied";
      } else {
        firstUpdate = { title, body };
      }
    }
  }

  if (Object.keys(details).length > 0) {
    return fail("Validation failed", details);
  }

  const computed = calculateTier(tieringAssessment as SubmissionTieringAssessment);
  if (computed === null) {
    return fail("Validation failed", { tieringAssessment: "All 10 questions must be answered" });
  }
  if (computed !== input.declaredOverallTier) {
    return fail("Tier mismatch", {
      declaredOverallTier: `Server recomputed tier ${computed}, body declared ${String(input.declaredOverallTier)}`,
    });
  }

  const body: SubmissionRequestBody = {
    name: (name as string).trim(),
    description,
    projectStage: input.projectStage as SubmissionRequestBody["projectStage"],
    group: group as RefSelection,
    directorate: directorate as RefSelection,
    businessAreaIds: businessAreaIds as string[],
    deliveryOwner: deliveryOwner as PersonRefSelection,
    businessLeadId,
    legalLeadId,
    capability: capability as RefSelection,
    additionalCapabilityIds: additionalCapabilityIds as string[],
    actionPlanLinkIds: actionPlanLinkIds as string[],
    tieringAssessment: tieringAssessment as SubmissionTieringAssessment,
    surveyDetails,
    declaredOverallTier: input.declaredOverallTier as Tier,
    firstUpdate,
  };

  return { ok: true, body, computedTier: computed };
}
