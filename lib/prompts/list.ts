import "server-only";

import { getSanityClient } from "@/lib/sanity/client";

import type { PromptFilters } from "./filters";
import type { PromptListItem } from "./types";

/**
 * GROQ projection for the prompts list. The author reference is resolved
 * to a name only — the email is intentionally not selected so it cannot
 * leak into the public read view. Upvote and comment counts are
 * aggregated server-side so the response stays small.
 *
 * Comments are projected in full (author display name only, plus an
 * `authorSeed` derived from the author document's `_id`) so the modal
 * can render off the same payload — no extra fetch on click. The
 * comment-author email is never selected and so cannot reach the
 * client, in line with the privacy requirement in the spec delta.
 *
 * Tag and tool filters are empty-safe (`count(...) == 0` short-circuits)
 * so the same query handles "no filters" and any subset.
 *
 * Spec: `openspec/specs/prompts-library/spec.md`.
 */
export const PROMPTS_LIST_QUERY = /* groq */ `
  *[_type == "prompt"
    && (count($tags) == 0 || count(tags[@ in $tags]) == count($tags))
    && ($tool == "" || tool == $tool)
  ] | order(coalesce(createdAt, _createdAt) desc) {
    _id,
    title,
    summary,
    body,
    tool,
    tags,
    "createdAt": coalesce(createdAt, _createdAt),
    "authorName": author->name,
    "authorSeed": author->_id,
    "upvoteCount": count(upvotes),
    "commentCount": count(comments),
    "comments": coalesce(comments[]{
      _key,
      body,
      createdAt,
      parentKey,
      "authorName": *[_type == "person" && email == ^.userEmail][0].name,
      "authorSeed": *[_type == "person" && email == ^.userEmail][0]._id,
      "upvoteCount": count(upvotes)
    }, []) | order(coalesce(createdAt, "") asc),
    competitionMonth
  }
`;

export async function fetchPrompts(filters: PromptFilters): Promise<PromptListItem[]> {
  const client = getSanityClient();
  return client.fetch<PromptListItem[]>(PROMPTS_LIST_QUERY, {
    tags: filters.tags,
    tool: filters.tool ?? "",
  });
}
