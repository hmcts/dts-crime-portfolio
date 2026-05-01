import { defineField, defineType } from "sanity";
import { STAGES, STAGE_LABELS } from "@/lib/enums/stage";
import { TIERS, TIER_LABELS } from "@/lib/enums/tier";

const STAGE_OPTIONS = STAGES.map((value) => ({ value, title: STAGE_LABELS[value] }));
const TIER_OPTIONS = TIERS.map((value) => ({ value, title: TIER_LABELS[value] }));

const RISK_REGISTER_OPTIONS = [
  { value: "yes", title: "Yes" },
  { value: "no", title: "No" },
  { value: "unknown", title: "Unknown" },
];

const ASSURANCE_STATUS_OPTIONS = [
  { value: "complete", title: "Complete" },
  { value: "in-progress", title: "In progress" },
  { value: "not-required", title: "Not required" },
  { value: "missing", title: "Missing" },
];

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  description:
    "Central document. Spec: openspec/specs/portfolio-management/spec.md, " +
    "openspec/specs/project-dossier/spec.md.",
  groups: [
    { name: "identity", title: "Identity", default: true },
    { name: "org", title: "Org structure" },
    { name: "people", title: "People" },
    { name: "capability", title: "Capability" },
    { name: "actionPlan", title: "Action plan" },
    { name: "governance", title: "Governance" },
    { name: "operational", title: "Operational" },
    { name: "updates", title: "Updates" },
    { name: "system", title: "System" },
  ],
  fields: [
    // Identity
    defineField({
      name: "name",
      type: "string",
      group: "identity",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 4,
      group: "identity",
    }),
    defineField({
      name: "projectStage",
      title: "Project stage",
      type: "string",
      group: "identity",
      options: { list: STAGE_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    }),

    // Org
    defineField({
      name: "group",
      type: "reference",
      to: [{ type: "group" }],
      group: "org",
    }),
    defineField({
      name: "directorate",
      type: "reference",
      to: [{ type: "directorate" }],
      group: "org",
    }),
    defineField({
      name: "businessAreas",
      title: "Business areas",
      type: "array",
      of: [{ type: "reference", to: [{ type: "businessArea" }] }],
      group: "org",
    }),

    // People
    defineField({
      name: "deliveryOwner",
      title: "Delivery owner",
      type: "reference",
      to: [{ type: "person" }],
      group: "people",
    }),
    defineField({
      name: "additionalDeliveryOwners",
      title: "Additional delivery owners",
      type: "array",
      of: [{ type: "reference", to: [{ type: "person" }] }],
      group: "people",
    }),
    defineField({
      name: "businessLead",
      title: "Business lead",
      type: "reference",
      to: [{ type: "person" }],
      group: "people",
    }),
    defineField({
      name: "legalLead",
      title: "Legal lead",
      type: "reference",
      to: [{ type: "person" }],
      group: "people",
    }),

    // Capability
    defineField({
      name: "capability",
      type: "reference",
      to: [{ type: "capability" }],
      group: "capability",
    }),
    defineField({
      name: "additionalCapabilities",
      title: "Additional capabilities",
      type: "array",
      of: [{ type: "reference", to: [{ type: "capability" }] }],
      group: "capability",
    }),

    // Action plan
    defineField({
      name: "actionPlanLinks",
      title: "Action plan links",
      type: "array",
      of: [{ type: "reference", to: [{ type: "action" }] }],
      group: "actionPlan",
    }),

    // Governance
    defineField({
      name: "tieringAssessment",
      title: "Tiering assessment",
      type: "tieringAssessment",
      group: "governance",
    }),
    defineField({
      name: "governanceTier",
      title: "Governance tier",
      type: "number",
      group: "governance",
      options: { list: TIER_OPTIONS, layout: "radio" },
      description:
        "Derived from the tiering assessment server-side. Do not edit " +
        "directly — the server recomputes on every save.",
      readOnly: true,
    }),
    defineField({
      name: "governanceBody",
      title: "Governance body",
      type: "string",
      group: "governance",
      description: "e.g. 'EM Delivery Board'.",
    }),
    defineField({
      name: "riskRegister",
      title: "Risk register",
      type: "string",
      group: "governance",
      options: { list: RISK_REGISTER_OPTIONS, layout: "radio" },
    }),
    defineField({
      name: "dpiaInPlace",
      title: "DPIA in place",
      type: "string",
      group: "governance",
      options: { list: ASSURANCE_STATUS_OPTIONS, layout: "radio" },
    }),
    defineField({
      name: "actsInPlace",
      title: "ATRS in place",
      type: "string",
      group: "governance",
      options: { list: ASSURANCE_STATUS_OPTIONS, layout: "radio" },
    }),
    defineField({
      name: "mojEthicsFrameworkUse",
      title: "Ethics framework use",
      type: "string",
      group: "governance",
      options: {
        list: [
          { value: "yes", title: "Yes" },
          { value: "no", title: "No" },
          { value: "in-progress", title: "In progress" },
          { value: "unknown", title: "Unknown" },
        ],
        layout: "radio",
      },
    }),

    // Operational
    defineField({
      name: "surveyDetails",
      title: "Survey details",
      type: "surveyDetails",
      group: "operational",
    }),
    defineField({
      name: "githubUrl",
      title: "GitHub URL",
      type: "url",
      group: "operational",
    }),

    // Updates
    defineField({
      name: "updates",
      type: "array",
      of: [{ type: "projectUpdate" }],
      group: "updates",
    }),

    // System
    defineField({
      name: "lastUpdatedAt",
      title: "Last updated at",
      type: "datetime",
      group: "system",
      readOnly: true,
      description:
        "Set server-side on every save. Powers the 'Last updated' footer on " +
        "portfolio cards.",
    }),
  ],
  preview: {
    select: {
      title: "name",
      stage: "projectStage",
      group: "group.name",
      directorate: "directorate.name",
    },
    prepare: ({ title, stage, group, directorate }) => ({
      title,
      subtitle: [STAGE_LABELS[stage as (typeof STAGES)[number]] ?? stage, group, directorate]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});
