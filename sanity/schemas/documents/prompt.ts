import { defineField, defineType } from "sanity";

const TOOL_OPTIONS = [
  { value: "copilot", title: "Copilot" },
  { value: "chatgpt-enterprise", title: "ChatGPT Enterprise" },
  { value: "m365-copilot", title: "M365 Copilot" },
  { value: "claude", title: "Claude" },
  { value: "other", title: "Other" },
];

export const prompt = defineType({
  name: "prompt",
  title: "Prompt",
  type: "document",
  description:
    "Community prompt entry. Spec: openspec/specs/prompts-library/spec.md.",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "body",
      type: "text",
      rows: 8,
      description: "The actual prompt text. Rendered in a monospace block.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tool",
      type: "string",
      options: { list: TOOL_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          "#HR",
          "#Tech",
          "#Legal",
          "#Finance",
          "#Operations",
          "#Communications",
          "#Policy",
          "#Data Analysis",
          "#Research",
          "#Other",
        ].map((tag) => ({ value: tag, title: tag })),
      },
    }),
    defineField({
      name: "author",
      type: "reference",
      to: [{ type: "person" }],
    }),
    defineField({
      name: "createdAt",
      title: "Created at",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "upvotes",
      type: "array",
      of: [{ type: "promptUpvote" }],
      readOnly: true,
      description:
        "Written via POST /api/prompts/[id]/upvote — idempotent per user.",
    }),
    defineField({
      name: "comments",
      type: "array",
      of: [{ type: "promptComment" }],
      readOnly: true,
    }),
    defineField({
      name: "competitionMonth",
      title: "Competition month",
      type: "string",
      description:
        "YYYY-MM. Set by the monthly tabulator on the previous month's " +
        "winning prompt. Drives the leaderboard banner.",
      validation: (rule) => rule.regex(/^\d{4}-\d{2}$/),
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "tool", author: "author.name" },
    prepare: ({ title, subtitle, author }) => ({
      title,
      subtitle: [author, subtitle].filter(Boolean).join(" · "),
    }),
  },
});
