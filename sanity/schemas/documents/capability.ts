import { defineField, defineType } from "sanity";

export const capability = defineType({
  name: "capability",
  title: "Capability",
  type: "document",
  description:
    "AI capability tag. Examples: Predictive Analytics, General Purpose LLM, " +
    "Image and Visual Data Analysis, Speech / Audio Processing, Search and " +
    "Knowledge Management, Software development / Coding, Public Facing AI, " +
    "Workflow application, Learning products, Data linkage, Redaction, " +
    "RPA / Agentic capabilities.",
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
