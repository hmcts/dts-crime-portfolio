import { defineField, defineType } from "sanity";

const TYPE_OPTIONS = [
  { value: "video", title: "Video" },
  { value: "guide", title: "Guide" },
  { value: "playlist", title: "Playlist" },
];

const LEVEL_OPTIONS = [
  { value: "beginner", title: "Beginner" },
  { value: "intermediate", title: "Intermediate" },
  { value: "advanced", title: "Advanced" },
];

export const learningItem = defineType({
  name: "learningItem",
  title: "Learning item",
  type: "document",
  description:
    "Video, guide, or playlist on the Learning hub. Spec: " +
    "openspec/specs/learning-hub/spec.md.",
  fields: [
    defineField({
      name: "type",
      type: "string",
      options: { list: TYPE_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      type: "array",
      of: [{ type: "block" }],
      description: "Portable Text. Rendered by the content viewer.",
    }),
    defineField({
      name: "tags",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "mediaAsset",
      title: "Media asset",
      type: "file",
      description:
        "Optional media file for videos, or supporting download for guides.",
    }),
    defineField({
      name: "mediaUrl",
      title: "Media URL",
      type: "url",
      description: "External link, e.g. SharePoint Stream for hosted videos.",
    }),
    defineField({
      name: "readingTimeMinutes",
      title: "Reading time (minutes)",
      type: "number",
      description: "Approximate reading or watch time. Shown on the card.",
    }),
    defineField({
      name: "level",
      type: "string",
      options: { list: LEVEL_OPTIONS, layout: "radio" },
    }),
    defineField({
      name: "featured",
      type: "boolean",
      initialValue: false,
      description:
        "Featured items render with a 'Featured' pill and appear first " +
        "in the default ordering.",
    }),
    defineField({
      name: "playlistChildren",
      title: "Playlist children",
      type: "array",
      of: [{ type: "reference", to: [{ type: "learningItem" }] }],
      hidden: ({ document }) => document?.type !== "playlist",
      description: "Only used when type=playlist. Order is meaningful.",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "type", featured: "featured" },
    prepare: ({ title, subtitle, featured }) => ({
      title,
      subtitle: featured ? `${subtitle} · Featured` : subtitle,
    }),
  },
});
