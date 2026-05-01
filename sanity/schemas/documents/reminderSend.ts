import { defineField, defineType } from "sanity";

const KIND_OPTIONS = [
  { value: "send", title: "Send" },
  { value: "failure", title: "Failure" },
  { value: "skipped", title: "Skipped (opted out)" },
];

export const reminderSend = defineType({
  name: "reminderSend",
  title: "Reminder send (audit)",
  type: "document",
  description:
    "Audit row for the daily stale-data reminder job. Spec: " +
    "openspec/specs/email-reminders/spec.md.",
  readOnly: true,
  fields: [
    defineField({
      name: "kind",
      type: "string",
      options: { list: KIND_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "ownerEmail",
      title: "Owner email",
      type: "string",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "projects",
      type: "array",
      of: [{ type: "reference", to: [{ type: "project" }] }],
      description: "Stale projects bundled into this reminder.",
    }),
    defineField({
      name: "notifyMessageId",
      title: "Notify message ID",
      type: "string",
      description: "Returned by GOV.UK Notify on a successful send.",
    }),
    defineField({
      name: "error",
      type: "text",
      rows: 3,
      description: "Populated when kind=failure.",
    }),
    defineField({
      name: "reason",
      type: "string",
      description: "Populated when kind=skipped (e.g. 'emailOptOut').",
    }),
    defineField({
      name: "at",
      title: "Recorded at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "atDesc",
      by: [{ field: "at", direction: "desc" }],
    },
  ],
  preview: {
    select: { kind: "kind", owner: "ownerEmail", at: "at" },
    prepare: ({ kind, owner, at }) => ({ title: `${kind}: ${owner}`, subtitle: at }),
  },
});
