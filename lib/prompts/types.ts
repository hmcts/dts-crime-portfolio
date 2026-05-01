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

export const PROMPT_SORTS = [
  "recommended",
  "upvotes",
  "new",
  "comments",
] as const;
export type PromptSort = (typeof PROMPT_SORTS)[number];

export const DEFAULT_PROMPT_SORT: PromptSort = "recommended";

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
  upvoteCount: number;
  commentCount: number;
  competitionMonth: string | null;
}
