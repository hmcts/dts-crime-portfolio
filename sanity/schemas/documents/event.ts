import { defineField, defineType } from "sanity";

export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  description: "An upcoming session or meet-up. Spec: openspec/specs/events-listing/spec.md.",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      type: "string",
      description: "e.g. Workshop, Show & Tell, Drop-in.",
    }),
    defineField({
      name: "location",
      type: "string",
      description: "Free text — physical location, 'Online (Teams)', etc.",
    }),
    defineField({
      name: "startsAt",
      title: "Starts at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "endsAt",
      title: "Ends at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      type: "array",
      of: [{ type: "block" }],
    }),
  ],
  orderings: [
    {
      title: "Starts soonest first",
      name: "startsAtAsc",
      by: [{ field: "startsAt", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "startsAt", category: "category" },
    prepare: ({ title, subtitle, category }) => ({
      title,
      subtitle: [category, subtitle].filter(Boolean).join(" · "),
    }),
  },
});
