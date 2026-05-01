import { defineField, defineType } from "sanity";

export const editorAccess = defineType({
  name: "editorAccess",
  title: "Editor access",
  type: "document",
  description:
    "Per-email allowlist mapping a user to the projects they can edit. " +
    "Admins do not need an entry here. Spec: " +
    "openspec/specs/access-control/spec.md (Three-role model, Allowlist " +
    "management).",
  fields: [
    defineField({
      name: "email",
      type: "string",
      validation: (rule) => rule.required().email(),
      description:
        "Lower-case email matched against the x-user-email header on every " +
        "request. Stored verbatim.",
    }),
    defineField({
      name: "projects",
      type: "array",
      of: [{ type: "reference", to: [{ type: "project" }] }],
      description:
        "Projects this email can mutate via PATCH /api/portfolios/[id] and " +
        "the edit-studio routes.",
    }),
  ],
  preview: {
    select: { title: "email", count: "projects.length" },
    prepare: ({ title, count }) => ({
      title,
      subtitle:
        typeof count === "number" ? `${count} project${count === 1 ? "" : "s"}` : "0 projects",
    }),
  },
});
