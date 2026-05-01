import { defineField, defineType } from "sanity";

export const businessArea = defineType({
  name: "businessArea",
  title: "Business area",
  type: "document",
  description: "Examples: HMPPS, HMCTS, HQ, LAA, OPG, CICA, Judicial Office.",
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "pendingReview",
      title: "Pending review",
      type: "boolean",
      initialValue: false,
    }),
  ],
});
