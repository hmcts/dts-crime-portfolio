/**
 * Canonical FAQ section list. Order is meaningful — `groupFaqEntriesBySection`
 * uses it to drive the rendered section sequence on /help. Adding a section
 * means appending here and writing one or more files in `content/faqs/`.
 *
 * Spec: openspec/specs/help-faq/spec.md (Section order).
 */
export const FAQ_SECTIONS = [
  "1. Getting started",
  "2. Using AI tools effectively",
  "3. Acceptable use",
  "4. Context and knowledge",
  "5. Data security and privacy",
  "6. Copyright",
  "7. Ethics and public service values",
  "8. Environment",
  "9. Workforce and responsibility",
  "10. Overall AI strategy and portfolio",
] as const;

export type FaqSection = (typeof FAQ_SECTIONS)[number];
