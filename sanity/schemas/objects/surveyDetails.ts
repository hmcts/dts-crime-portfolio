import { defineField, defineType } from "sanity";

export const surveyDetails = defineType({
  name: "surveyDetails",
  title: "Survey details",
  type: "object",
  description:
    "Operational metadata captured at submission: supplier, user counts, " +
    "funding, PII flags, and source idea reference.",
  fields: [
    defineField({ name: "supplier", type: "string" }),
    defineField({
      name: "userCount",
      title: "User count",
      type: "number",
      description: "Estimated number of users when in scale stage.",
    }),
    defineField({ name: "funding", type: "string" }),
    defineField({
      name: "containsPii",
      title: "Contains PII",
      type: "boolean",
    }),
    defineField({
      name: "sourceIdeaRef",
      title: "Source idea (legacy reference)",
      type: "string",
      description:
        "Optional. Free-text identifier for a scan-stage idea this project " +
        "was promoted from. Replaced by a real reference once a ProjectIdea " +
        "schema lands.",
    }),
  ],
});
