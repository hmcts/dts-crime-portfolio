import { defineField, defineType } from "sanity";

export const FAQ_SECTIONS = [
  "1. Getting started",
  "2. Using AI tools effectively",
  "3. Acceptable use",
  "4. Context and knowledge",
  "5. Data security and privacy",
  "6. Copyright",
  "7. Ethics and public service values",
  "8. Environment",
  "9. Workforce and responsibility",
  "10. Overall AI strategy and portfolio",
] as const;

export const faq = defineType({
  name: "faq",
  title: "FAQ entry",
  type: "document",
  description:
    "Help-page FAQ entry. Sections and ordering match openspec/specs/help-faq/spec.md.",
  fields: [
    defineField({
      name: "section",
      type: "string",
      options: {
        list: FAQ_SECTIONS.map((value) => ({ value, title: value })),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "number",
      type: "number",
      description: "Order within the section (ascending).",
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: "question",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "answer",
      type: "array",
      of: [{ type: "block" }],
      description: "Portable Text.",
    }),
  ],
  orderings: [
    {
      title: "Section then number",
      name: "sectionThenNumber",
      by: [
        { field: "section", direction: "asc" },
        { field: "number", direction: "asc" },
      ],
    },
  ],
  preview: {
    select: { title: "question", subtitle: "section", number: "number" },
    prepare: ({ title, subtitle, number }) => ({
      title,
      subtitle: `${subtitle} #${number}`,
    }),
  },
});
