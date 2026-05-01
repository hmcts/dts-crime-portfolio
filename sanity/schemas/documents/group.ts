import { defineField, defineType } from "sanity";

export const group = defineType({
  name: "group",
  title: "Group",
  type: "document",
  description:
    "Top-level org unit. Examples: STG, HMCTS, COO Group, Policy Group, " +
    "Judicial Office, HMPPS, CICA.",
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
