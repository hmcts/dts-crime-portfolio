import type { Tier } from "@/lib/enums/tier";

export const TIERING_QUESTIONS = [
  "natureOfApplication",
  "reach",
  "thirdPartyInvolvement",
  "ownership",
  "publicTrustImplications",
  "legalRegulatoryImplications",
  "technicalComplexity",
  "automatedDecisionMaking",
  "typeOfData",
  "dataStorage",
] as const;

export type TieringQuestion = (typeof TIERING_QUESTIONS)[number];

export type TieringAnswers = Partial<Record<TieringQuestion, Tier>>;

/**
 * Calculate the overall governance tier from the 10-question tiering
 * assessment. Returns the maximum of all answered per-question tier values,
 * or `null` when no questions have been answered.
 *
 * Spec: openspec/specs/project-submission/spec.md (Requirement: 10-question
 * tiering assessment).
 */
export function calculateTier(answers: TieringAnswers): Tier | null {
  const values = Object.values(answers).filter(
    (value): value is Tier => value === 1 || value === 2 || value === 3,
  );
  if (values.length === 0) return null;
  return Math.max(...values) as Tier;
}

/**
 * Number of answered questions. Used by the submission form's progress
 * indicator within section 1.
 */
export function answeredCount(answers: TieringAnswers): number {
  return Object.values(answers).filter(
    (value) => value === 1 || value === 2 || value === 3,
  ).length;
}
