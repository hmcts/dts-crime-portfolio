import "server-only";

import { loadFaqEntries } from "./load-faqs";

import type { FaqEntry } from "./types";

export type { FaqEntry } from "./types";
export type { FaqSection } from "./sections";
export {
  filterFaqEntries,
  groupFaqEntriesBySection,
  portableTextToPlain,
} from "./types";

/**
 * Load every FAQ entry. Backed by `content/faqs/*.md` (file-based) — the
 * earlier Sanity GROQ projection has been retired so editorial content
 * is reviewable via PR. The function name is preserved so consumers are
 * unchanged. Spec: openspec/specs/help-faq/spec.md.
 */
export async function fetchFaqEntries(): Promise<FaqEntry[]> {
  return loadFaqEntries();
}
