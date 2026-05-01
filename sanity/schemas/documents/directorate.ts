import { defineField, defineType } from "sanity";

export const directorate = defineType({
  name: "directorate",
  title: "Directorate",
  type: "document",
  description: "Sub-division of a Group. Examples: Data, Digital, Justice AI Unit, People & Capability.",
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "group",
      type: "reference",
      to: [{ type: "group" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "pendingReview",
      title: "Pending review",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "group.name" },
  },
});
