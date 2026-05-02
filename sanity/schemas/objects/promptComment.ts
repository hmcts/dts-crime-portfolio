import { defineField, defineType } from "sanity";

/**
 * One comment on a prompt. Comments live as an inline array on the prompt
 * document.
 *
 * v2 (`expand-prompts-comments-and-replies`) adds two fields:
 *
 * - `upvotes` — same shape as the prompt-level `promptUpvote`. Idempotent
 *   per `userEmail` so the same user clicking twice nets zero. Stored as
 *   a thinly-typed inline object array (rather than referencing the
 *   `promptUpvote` type) to avoid coupling comment upvotes to any future
 *   evolution of the prompt-level upvote shape.
 *
 * - `parentKey` — when set, this comment is a reply to the comment with
 *   that `_key` on the same prompt. Only one nesting level: a reply is
 *   itself a top-level entry in the same `comments` array, just with
 *   `parentKey` populated. Top-level comments leave it null.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Comments thread modal,
 * Per-comment idempotent upvotes, Single-level threaded replies).
 */
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
    defineField({
      name: "parentKey",
      title: "Parent comment _key",
      type: "string",
      description:
        "When set, this comment is a reply to the comment with this " +
        "_key on the same prompt. Top-level comments leave this empty.",
    }),
    defineField({
      name: "upvotes",
      title: "Upvotes",
      type: "array",
      description:
        "One entry per user who has upvoted this comment. Idempotent: " +
        "duplicate entries are removed by the toggle endpoint.",
      of: [
        {
          type: "object",
          name: "promptCommentUpvote",
          title: "Comment upvote",
          fields: [
            {
              name: "userEmail",
              title: "User email",
              type: "string",
              readOnly: true,
              validation: (rule) => rule.required().email(),
            },
            {
              name: "createdAt",
              title: "Created at",
              type: "datetime",
              readOnly: true,
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: { title: "userEmail", subtitle: "body" },
  },
});
