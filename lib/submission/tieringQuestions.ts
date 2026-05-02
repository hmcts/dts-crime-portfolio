import type { Tier } from "@/lib/enums/tier";
import {
  TIERING_QUESTIONS,
  type TieringQuestion,
} from "@/lib/tiering/calculator";

export interface TieringOption {
  label: string;
  tier: Tier;
}

export interface TieringQuestionDef {
  key: TieringQuestion;
  title: string;
  options: [TieringOption, TieringOption, TieringOption];
}

/**
 * Descriptive option labels for the 10-question tiering assessment. Each
 * answer maps to Tier 1 (low risk), Tier 2 (medium), or Tier 3 (high). The
 * overall governance tier is the maximum of selected tiers.
 *
 * Spec: openspec/specs/project-submission/spec.md (Requirement: 10-question
 * tiering assessment).
 */
export const TIERING_QUESTION_DEFS: readonly TieringQuestionDef[] = [
  {
    key: "natureOfApplication",
    title: "Nature of application",
    options: [
      { tier: 1, label: "Internal-only productivity / back-office tool" },
      { tier: 2, label: "Operational tool used by HMCTS staff" },
      { tier: 3, label: "Public-facing or used directly in justice decisions" },
    ],
  },
  {
    key: "reach",
    title: "Reach / user base",
    options: [
      { tier: 1, label: "A handful of staff or a single team" },
      { tier: 2, label: "Multiple teams or a directorate" },
      { tier: 3, label: "Cross-organisation, members of the public, or judiciary" },
    ],
  },
  {
    key: "thirdPartyInvolvement",
    title: "Third-party involvement",
    options: [
      { tier: 1, label: "No third-party data or services involved" },
      { tier: 2, label: "Uses a third-party model or service with no PII" },
      { tier: 3, label: "Third party processes PII or sensitive justice data" },
    ],
  },
  {
    key: "ownership",
    title: "Ownership scope",
    options: [
      { tier: 1, label: "Owned by a single team or individual" },
      { tier: 2, label: "Shared across teams within a directorate" },
      { tier: 3, label: "Cross-departmental or external joint ownership" },
    ],
  },
  {
    key: "publicTrustImplications",
    title: "Public trust implications",
    options: [
      { tier: 1, label: "Negligible — invisible to the public" },
      { tier: 2, label: "Moderate — visible internal change with low public impact" },
      { tier: 3, label: "High — directly affects public perception of justice" },
    ],
  },
  {
    key: "legalRegulatoryImplications",
    title: "Legal / regulatory implications",
    options: [
      { tier: 1, label: "None beyond standard internal policy" },
      { tier: 2, label: "Subject to data-protection or procurement scrutiny" },
      { tier: 3, label: "Touches statutory duties, ECHR, or judicial independence" },
    ],
  },
  {
    key: "technicalComplexity",
    title: "Technical complexity",
    options: [
      { tier: 1, label: "Off-the-shelf product, minimal config" },
      { tier: 2, label: "Custom integration with existing HMCTS systems" },
      { tier: 3, label: "Bespoke model or critical-path infrastructure" },
    ],
  },
  {
    key: "automatedDecisionMaking",
    title: "Automated decision-making",
    options: [
      { tier: 1, label: "No automated decisions — human-in-loop only" },
      { tier: 2, label: "Decision-support — recommends, human decides" },
      { tier: 3, label: "Automated decision affecting individuals' rights" },
    ],
  },
  {
    key: "typeOfData",
    title: "Type of data",
    options: [
      { tier: 1, label: "Public or fully anonymised data" },
      { tier: 2, label: "Internal operational data without PII" },
      { tier: 3, label: "PII, special-category, or case data" },
    ],
  },
  {
    key: "dataStorage",
    title: "Data storage",
    options: [
      { tier: 1, label: "MoJ-approved cloud, UK region, encrypted at rest" },
      { tier: 2, label: "Approved cloud with non-standard handling agreement" },
      { tier: 3, label: "Off-platform, third-party, or non-UK storage" },
    ],
  },
];

if (TIERING_QUESTION_DEFS.length !== TIERING_QUESTIONS.length) {
  throw new Error(
    "TIERING_QUESTION_DEFS must define one entry per TIERING_QUESTIONS key",
  );
}
