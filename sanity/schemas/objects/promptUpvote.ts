import { defineField, defineType } from "sanity";

export const promptUpvote = defineType({
  name: "promptUpvote",
  title: "Prompt upvote",
  type: "object",
  description:
    "One upvote per user per prompt. Idempotent: a duplicate request from " +
    "the same email is a no-op (a toggle removes the entry). Spec: " +
    "openspec/specs/prompts-library/spec.md (Idempotent upvotes).",
  fields: [
    defineField({
      name: "userEmail",
      title: "User email",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "createdAt",
      title: "Created at",
      type: "datetime",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "userEmail", subtitle: "createdAt" },
  },
});
