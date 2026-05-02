import { isStage } from "@/lib/enums/stage";
import { TIERING_QUESTIONS } from "@/lib/tiering/calculator";

import type { SubmissionFormState } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC-5322-ish email validation, mirrored from `lib/auth/resolver.ts` so
 * that client and server agree. The server is authoritative — this is just
 * for inline UX feedback. */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export type SectionErrors = Record<string, string>;

/**
 * Validate one section of the form and return a map of `field → message`.
 * Returns an empty object when the section is complete.
 */
export function validateSection(
  index: number,
  state: SubmissionFormState,
): SectionErrors {
  switch (index) {
    case 0:
      return validateTiering(state);
    case 1:
      return validateBasics(state);
    case 2:
      return validateOwnership(state);
    case 3:
      return validateCapability(state);
    case 4:
      return validateGovernance(state);
    case 5:
      return validateUpdates(state);
    default:
      return {};
  }
}

function validateTiering(state: SubmissionFormState): SectionErrors {
  const errors: SectionErrors = {};
  for (const key of TIERING_QUESTIONS) {
    if (state.tieringAnswers[key] === undefined) {
      errors[`tiering.${key}`] = "Required";
    }
  }
  return errors;
}

function validateBasics(state: SubmissionFormState): SectionErrors {
  const errors: SectionErrors = {};
  if (state.name.trim().length === 0) errors.name = "Required";
  if (state.projectStage === "" || !isStage(state.projectStage)) {
    errors.projectStage = "Required";
  }
  return errors;
}

function validateOwnership(state: SubmissionFormState): SectionErrors {
  const errors: SectionErrors = {};
  if (!isRefSet(state.group)) errors.group = "Required";
  if (!isRefSet(state.directorate)) errors.directorate = "Required";

  const owner = state.deliveryOwner;
  if (!owner.id && !owner._new) {
    errors.deliveryOwner = "Required";
  } else if (owner._new) {
    if (owner._new.name.trim().length === 0) {
      errors["deliveryOwner.name"] = "Required";
    }
    if (!isValidEmail(owner._new.email)) {
      errors["deliveryOwner.email"] = "Must be a valid email";
    }
  }
  return errors;
}

function validateCapability(state: SubmissionFormState): SectionErrors {
  const errors: SectionErrors = {};
  if (!isRefSet(state.capability)) errors.capability = "Required";
  return errors;
}

function validateGovernance(_state: SubmissionFormState): SectionErrors {
  // Governance fields are all optional per spec — captured if present.
  return {};
}

function validateUpdates(state: SubmissionFormState): SectionErrors {
  const errors: SectionErrors = {};
  // Updates section is optional. If a body is supplied without a title,
  // require a title.
  if (
    state.firstUpdateTitle.trim().length === 0 &&
    state.firstUpdateBody.trim().length > 0
  ) {
    errors.firstUpdateTitle = "Required when an update body is supplied";
  }
  return errors;
}

function isRefSet(ref: { id: string | null; _new?: unknown }): boolean {
  return Boolean(ref.id) || Boolean(ref._new);
}
