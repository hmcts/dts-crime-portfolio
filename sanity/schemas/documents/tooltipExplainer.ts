import { defineField, defineType } from "sanity";

const KEY_OPTIONS = [
  { value: "delivery-area", title: "Delivery area" },
  { value: "business-area", title: "Business area" },
  { value: "governance-tier", title: "Governance tier" },
  { value: "risk-register", title: "Risk register" },
  { value: "dpia", title: "DPIA" },
  { value: "atrs", title: "ATRS" },
  { value: "ethics-framework", title: "Ethics framework" },
];

export const tooltipExplainer = defineType({
  name: "tooltipExplainer",
  title: "Tooltip explainer",
  type: "document",
  description:
    "Content-managed copy for the `i` icon explainers next to internal " +
    "jargon labels. Editable in the Studio so HMCTS can update wording " +
    "without a release. Spec: openspec/specs/project-dossier/spec.md " +
    "(Tooltip explainers on jargon).",
  fields: [
    defineField({
      name: "key",
      type: "string",
      options: { list: KEY_OPTIONS },
      description:
        "Stable identifier matched in code. Add more options here as new " +
        "jargon appears.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      type: "string",
      description: "Display title shown at the top of the tooltip body.",
    }),
    defineField({
      name: "body",
      type: "array",
      of: [{ type: "block" }],
      description: "Portable Text.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "key" },
  },
});
