import { defineField, defineType } from "sanity";

export const changeLog = defineType({
  name: "changeLog",
  title: "ChangeLog",
  type: "document",
  description:
    "Audit row written by every successful mutation in the same Sanity " +
    "transaction as the document update. Drives Recent Activity counts and " +
    "the compare/diff feature. Spec: openspec/specs/change-tracking/spec.md.",
  readOnly: true,
  fields: [
    defineField({
      name: "documentId",
      title: "Document ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "documentType",
      title: "Document type",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "field",
      title: "Field path",
      type: "string",
      description: "Dotted path, e.g. 'tieringAssessment.dataStorage'.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "before",
      title: "Before value",
      // Stored as JSON string so any leaf type can be captured without a union.
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "after",
      title: "After value",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "userEmail",
      title: "User email",
      type: "string",
      description: "From x-user-email header at write time. Never client-supplied.",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "timestamp",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "timestampDesc",
      by: [{ field: "timestamp", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      docType: "documentType",
      field: "field",
      user: "userEmail",
      ts: "timestamp",
    },
    prepare: ({ docType, field, user, ts }) => ({
      title: `${docType}.${field}`,
      subtitle: `${user} · ${ts}`,
    }),
  },
});
