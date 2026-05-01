import { defineField, defineType } from "sanity";
import { TIERING_QUESTIONS } from "@/lib/tiering/calculator";

const TIER_OPTIONS = [
  { title: "Tier 1", value: 1 },
  { title: "Tier 2", value: 2 },
  { title: "Tier 3", value: 3 },
];

// Human-readable titles for the 10 questions. The Studio renders these
// as section headers; the submission form (server-side) provides the
// per-tier descriptive labels for each option.
const QUESTION_TITLES: Record<(typeof TIERING_QUESTIONS)[number], string> = {
  natureOfApplication: "1. Nature of application",
  reach: "2. Reach / user base",
  thirdPartyInvolvement: "3. Third-party involvement",
  ownership: "4. Ownership scope",
  publicTrustImplications: "5. Public trust implications",
  legalRegulatoryImplications: "6. Legal / regulatory implications",
  technicalComplexity: "7. Technical complexity",
  automatedDecisionMaking: "8. Automated decision-making",
  typeOfData: "9. Type of data",
  dataStorage: "10. Data storage",
};

export const tieringAssessment = defineType({
  name: "tieringAssessment",
  title: "Tiering assessment",
  type: "object",
  description:
    "Ten-question structured risk assessment. Each answer is stored as the " +
    "tier value (1, 2, or 3). The overall governance tier on the project " +
    "document is the maximum of all answered values; see " +
    "lib/tiering/calculator.ts.",
  fields: TIERING_QUESTIONS.map((key) =>
    defineField({
      name: key,
      title: QUESTION_TITLES[key],
      type: "number",
      options: {
        list: TIER_OPTIONS,
        layout: "radio",
      },
    }),
  ),
});
