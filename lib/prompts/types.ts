/**
 * Shared types for the read-only `/prompts` library view. Spec:
 * `openspec/specs/prompts-library/spec.md`. Author email is intentionally
 * omitted from the list shape — the public listing exposes the author's
 * display name only.
 */

export const PROMPT_TAGS = [
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
] as const;
export type PromptTag = (typeof PROMPT_TAGS)[number];

export const PROMPT_TOOLS = [
  "copilot",
  "chatgpt-enterprise",
  "m365-copilot",
  "claude",
  "other",
] as const;
export type PromptTool = (typeof PROMPT_TOOLS)[number];

export const PROMPT_TOOL_LABELS: Record<PromptTool, string> = {
  copilot: "Copilot",
  "chatgpt-enterprise": "ChatGPT Enterprise",
  "m365-copilot": "M365 Copilot",
  claude: "Claude",
  other: "Other",
};

/**
 * Tailwind colour classes for each tool badge. Same mapping is reused on
 * card badges, the competition banner, and the tool filter row so the
 * colour cue stays consistent across the page (per spec scenario "Tool
 * badge").
 */
export const PROMPT_TOOL_BADGE_CLASSES: Record<PromptTool, { bg: string; fg: string }> = {
  copilot: { bg: "bg-blue-100", fg: "text-blue-800" },
  "chatgpt-enterprise": { bg: "bg-emerald-100", fg: "text-emerald-800" },
  "m365-copilot": { bg: "bg-indigo-100", fg: "text-indigo-800" },
  claude: { bg: "bg-amber-100", fg: "text-amber-800" },
  other: { bg: "bg-neutral-200", fg: "text-neutral-800" },
};

/**
 * Per-tag colour family used by the prompt card and modal. The Content
 * Designer's rationale: keep "communications" tags in the green family,
 * "people / process" tags in pink/peach, and "tech / data" tags in blue
 * so the colour itself carries a hint about what kind of prompt this is.
 * Pixel-perfect matching to the reference design isn't the bar — the
 * goal is each tag picks a stable, distinct family across the page.
 */
export const PROMPT_TAG_BADGE_CLASSES: Record<PromptTag, { bg: string; fg: string; dot: string }> = {
  "#Communications": { bg: "bg-emerald-100", fg: "text-emerald-800", dot: "bg-emerald-500" },
  "#Operations": { bg: "bg-green-100", fg: "text-green-800", dot: "bg-green-500" },
  "#HR": { bg: "bg-lime-100", fg: "text-lime-800", dot: "bg-lime-500" },
  "#Other": { bg: "bg-pink-100", fg: "text-pink-800", dot: "bg-pink-500" },
  "#Research": { bg: "bg-fuchsia-100", fg: "text-fuchsia-800", dot: "bg-fuchsia-500" },
  "#Finance": { bg: "bg-orange-100", fg: "text-orange-800", dot: "bg-orange-500" },
  "#Tech": { bg: "bg-blue-100", fg: "text-blue-800", dot: "bg-blue-500" },
  "#Data Analysis": { bg: "bg-sky-100", fg: "text-sky-800", dot: "bg-sky-500" },
  "#Policy": { bg: "bg-indigo-100", fg: "text-indigo-800", dot: "bg-indigo-500" },
  "#Legal": { bg: "bg-violet-100", fg: "text-violet-800", dot: "bg-violet-500" },
};

/**
 * Default tag styling for any tag that isn't in the curated map (e.g.
 * a tag value that has been removed from `PROMPT_TAGS` since the prompt
 * was created).
 */
export const PROMPT_TAG_BADGE_FALLBACK = {
  bg: "bg-neutral-100",
  fg: "text-neutral-800",
  dot: "bg-neutral-400",
} as const;

export const PROMPT_SORTS = [
  "recommended",
  "upvotes",
  "new",
  "comments",
] as const;
export type PromptSort = (typeof PROMPT_SORTS)[number];

export const DEFAULT_PROMPT_SORT: PromptSort = "recommended";

/**
 * One comment on a prompt as projected for the listing page. Author
 * email is excluded — the modal shows author display name only and
 * derives avatar colour from `authorSeed` (an opaque, stable hash) so
 * repeat authors still render with the same circle colour without
 * exposing the underlying email.
 */
export interface PromptComment {
  _key: string;
  authorName: string | null;
  authorSeed: string | null;
  body: string;
  createdAt: string | null;
  upvoteCount: number;
  parentKey: string | null;
}

/**
 * One prompt as projected for the listing page. Author email is excluded —
 * the listing surface shows author name only. Upvote and comment counts
 * are pre-aggregated by GROQ so the client never reads the underlying
 * arrays.
 */
export interface PromptListItem {
  _id: string;
  title: string;
  summary: string | null;
  body: string;
  tool: PromptTool;
  tags: PromptTag[];
  createdAt: string | null;
  authorName: string | null;
  authorSeed: string | null;
  upvoteCount: number;
  commentCount: number;
  comments: PromptComment[];
  competitionMonth: string | null;
}
