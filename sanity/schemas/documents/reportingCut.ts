import { defineField, defineType } from "sanity";

export const reportingCut = defineType({
  name: "reportingCut",
  title: "Reporting cut (snapshot)",
  type: "document",
  description:
    "A frozen copy of the entire portfolio at a chosen date. The snapshot " +
    "field stores resolved reference text (person names, group names, " +
    "capability names) inlined so old cuts read correctly after renames. " +
    "Spec: openspec/specs/compare-mode/spec.md.",
  readOnly: true,
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "note",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "createdAt",
      title: "Created at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "createdBy",
      title: "Created by",
      type: "string",
      description: "Email of the Admin who triggered the snapshot.",
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: "snapshot",
      type: "text",
      rows: 4,
      description:
        "JSON-encoded array of project documents with resolved reference " +
        "text. Stored as a string to avoid Sanity's per-field schema " +
        "constraints.",
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "createdAtDesc",
      by: [{ field: "createdAt", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "name", subtitle: "createdAt", createdBy: "createdBy" },
    prepare: ({ title, subtitle, createdBy }) => ({
      title,
      subtitle: [subtitle, createdBy].filter(Boolean).join(" · "),
    }),
  },
});
