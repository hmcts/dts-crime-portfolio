import { defineField, defineType } from "sanity";

export const person = defineType({
  name: "person",
  title: "Person",
  type: "document",
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "email",
      type: "string",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "avatarColour",
      type: "string",
      description: "Optional Tailwind colour token for the initials avatar.",
    }),
    defineField({
      name: "emailOptOut",
      title: "Email opt-out",
      type: "boolean",
      initialValue: false,
      description: "If true, the stale-data reminder job will skip this person.",
    }),
    defineField({
      name: "pendingReview",
      title: "Pending review",
      type: "boolean",
      initialValue: false,
      description:
        "True for entities created inline during submission. Hidden from " +
        "non-admin dropdowns until an Admin approves.",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "email" },
  },
});
