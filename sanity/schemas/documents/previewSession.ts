import { defineField, defineType } from "sanity";

export const previewSession = defineType({
  name: "previewSession",
  title: "Preview session",
  type: "document",
  description:
    "Audit row for the preview-auth flow: one document per email that has " +
    "ever signed in to a non-production environment. Spec: " +
    "openspec/specs/preview-auth/spec.md.",
  readOnly: true,
  fields: [
    defineField({
      name: "email",
      type: "string",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "firstSeenAt",
      title: "First seen at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "lastSeenAt",
      title: "Last seen at",
      type: "datetime",
    }),
  ],
  preview: {
    select: { title: "email", subtitle: "lastSeenAt" },
  },
});
