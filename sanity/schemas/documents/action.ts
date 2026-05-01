import { defineField, defineType } from "sanity";
import { PROGRESS_STATUSES } from "@/lib/enums/progress-status";

export const action = defineType({
  name: "action",
  title: "Action",
  type: "document",
  description: "An entry in the published AI strategy action plan.",
  fields: [
    defineField({
      name: "actionNo",
      title: "Action number",
      type: "string",
      description: "e.g. '2.6'.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "strand",
      type: "string",
      options: {
        list: [
          { value: "1. Foundations", title: "1. Strengthen our Foundations" },
          { value: "2. Embed", title: "2. Embed AI across the Justice System" },
          { value: "3. People & Partners", title: "3. Invest in our people and partners" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "priority",
      type: "string",
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "summaryOfProgress",
      title: "Summary of progress",
      type: "array",
      of: [{ type: "block" }],
      description: "Portable Text. Edited by Admins via the action plan progress route.",
    }),
    defineField({
      name: "progressStatus",
      title: "Progress status",
      type: "string",
      options: {
        list: PROGRESS_STATUSES.map((value) => ({ value, title: value })),
        layout: "radio",
      },
      validation: (rule) => rule.required(),
      initialValue: "Some progress",
    }),
    defineField({
      name: "publishedStrategyUrl",
      title: "Published strategy URL",
      type: "url",
      description: "Out-link to the published strategy entry for this action.",
    }),
  ],
  orderings: [
    {
      title: "Action number",
      name: "actionNoAsc",
      by: [{ field: "actionNo", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "actionNo", subtitle: "name" },
    prepare: ({ title, subtitle }) => ({ title: `${title} ${subtitle ?? ""}`, subtitle: undefined }),
  },
});
