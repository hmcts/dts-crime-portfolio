import { defineField, defineType } from "sanity";

export const projectUpdate = defineType({
  name: "projectUpdate",
  title: "Project update",
  type: "object",
  description:
    "One entry in the project's updates timeline. authorEmail and timestamp " +
    "are set server-side from the request header at write time and are " +
    "read-only in the Studio. Spec: openspec/specs/project-dossier/spec.md " +
    "(Updates timeline) and openspec/specs/edit-studio/spec.md.",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      type: "array",
      of: [{ type: "block" }],
      description: "Portable Text. Rendered by lib/portable-text/renderer.tsx.",
    }),
    defineField({
      name: "authorEmail",
      title: "Author email",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: "timestamp",
      type: "datetime",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "timestamp" },
  },
});
