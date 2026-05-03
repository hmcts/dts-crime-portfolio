import type { PortableTextBlock } from "@portabletext/types";

import { FAQ_SECTIONS, type FaqSection } from "./sections";

export type { FaqSection };

/**
 * Single published FAQ entry. The `answer` field is Portable Text rendered via
 * `PortableTextRenderer`. Spec: openspec/specs/help-faq/spec.md.
 */
export interface FaqEntry {
  _id: string;
  section: FaqSection;
  number: number;
  question: string;
  answer: PortableTextBlock[] | null;
}

/**
 * Group FAQ entries by section, preserving the canonical section order from
 * `FAQ_SECTIONS`. Sections with no entries map to an empty array. Within a
 * section, entries keep the order they arrive in (the GROQ query already
 * sorts by `number` ascending).
 *
 * Spec: openspec/specs/help-faq/spec.md (Section order).
 */
export function groupFaqEntriesBySection(
  entries: FaqEntry[],
): Record<FaqSection, FaqEntry[]> {
  const grouped = FAQ_SECTIONS.reduce(
    (acc, section) => {
      acc[section] = [];
      return acc;
    },
    {} as Record<FaqSection, FaqEntry[]>,
  );
  for (const entry of entries) {
    if (entry.section in grouped) {
      grouped[entry.section].push(entry);
    }
  }
  return grouped;
}

/**
 * Plain-text projection of a Portable Text answer, used for case-insensitive
 * substring matching in the search filter. Pulls every `span.text` from every
 * block and joins with spaces. Returns "" for null/empty answers.
 */
export function portableTextToPlain(blocks: PortableTextBlock[] | null): string {
  if (!blocks || blocks.length === 0) return "";
  const parts: string[] = [];
  for (const block of blocks) {
    if (!block || block._type !== "block") continue;
    const children = (block as { children?: Array<{ _type?: string; text?: string }> }).children;
    if (!children) continue;
    for (const child of children) {
      if (child?._type === "span" && typeof child.text === "string") {
        parts.push(child.text);
      }
    }
  }
  return parts.join(" ");
}

/**
 * Filter FAQ entries by case-insensitive substring match against either the
 * question text or the plain-text projection of the Portable Text answer.
 * Empty / whitespace-only queries return the input unchanged.
 *
 * Spec: openspec/specs/help-faq/spec.md (Cross-content search).
 */
export function filterFaqEntries(entries: FaqEntry[], query: string): FaqEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return entries;
  return entries.filter((entry) => {
    const question = entry.question?.toLowerCase() ?? "";
    if (question.includes(trimmed)) return true;
    const answer = portableTextToPlain(entry.answer).toLowerCase();
    return answer.includes(trimmed);
  });
}
