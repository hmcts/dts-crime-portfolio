import { defineField, defineType } from "sanity";

export const promptComment = defineType({
  name: "promptComment",
  title: "Prompt comment",
  type: "object",
  fields: [
    defineField({
      name: "userEmail",
      title: "User email",
      type: "string",
      readOnly: true,
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "body",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "createdAt",
      title: "Created at",
      type: "datetime",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "userEmail", subtitle: "body" },
  },
});
