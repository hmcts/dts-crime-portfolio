/**
 * GROQ queries for the Learning hub. Spec:
 * `openspec/specs/learning-hub/spec.md`.
 *
 * `LEARNING_LIST_QUERY` returns every published learning item ordered
 * featured-first then by `_createdAt` descending. Type and tag filtering
 * live in TypeScript (`applyLearningFilters`) so the chip row can show
 * the full tag union regardless of the active filter.
 */
export const LEARNING_LIST_QUERY = /* groq */ `
  *[_type == "learningItem"] | order(featured desc, _createdAt desc) {
    _id,
    type,
    title,
    body,
    tags,
    mediaUrl,
    readingTimeMinutes,
    level,
    "featured": coalesce(featured, false),
    "createdAt": _createdAt
  }
`;

export const LEARNING_ITEM_QUERY = /* groq */ `
  *[_type == "learningItem" && _id == $id][0] {
    _id,
    type,
    title,
    body,
    tags,
    mediaUrl,
    readingTimeMinutes,
    level,
    "featured": coalesce(featured, false),
    "createdAt": _createdAt
  }
`;

/**
 * Tag-union query. Used as a fallback (or future endpoint) when we want
 * the full tag list independent of the filtered card grid.
 */
export const LEARNING_TAGS_QUERY = /* groq */ `
  array::unique(*[_type == "learningItem" && defined(tags)].tags[])
`;
