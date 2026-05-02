/**
 * Plain-text fallback for the compare/Word briefing.
 *
 * The real renderer relies on the `docx` library, which is being added by a
 * parallel engineer working on the exports PR. Until that PR merges this
 * helper produces a deterministic plain-text representation with the same
 * three top-level sections (Added, Removed, Changed) the Word document will
 * eventually render. The shape of the route handler is identical, so once
 * the dep lands we drop in the docx renderer and remove this fallback.
 *
 * TODO replace with docx once exports PR merges.
 *
 * Spec: openspec/specs/compare-mode/spec.md (Word export of the diff).
 */
import type { CompareResult } from "./diff";

export interface CompareWordPlaceholderHeader {
  /** Used in the document title line, e.g. "Range: 2026-01-01 → 2026-04-01". */
  contextLine: string;
}

/**
 * Build a deterministic plain-text "what changed" briefing of a compare
 * result. The structure mirrors the eventual docx layout:
 *
 *   Compare briefing
 *   Range: ... (or Snapshot: ...)
 *
 *   Added (n)
 *     - Project name
 *
 *   Removed (n)
 *     - Project name
 *
 *   Changed (n)
 *     Project name
 *       field
 *         before: ...
 *         after:  ...
 */
export function renderCompareWordPlaceholder(
  result: CompareResult,
  header: CompareWordPlaceholderHeader,
): string {
  const lines: string[] = [];
  lines.push("Compare briefing");
  lines.push(header.contextLine);
  lines.push("");

  lines.push(`Added (${result.added.length})`);
  if (result.added.length === 0) {
    lines.push("  (none)");
  } else {
    for (const item of result.added) {
      lines.push(`  - ${item.projectName}`);
    }
  }
  lines.push("");

  lines.push(`Removed (${result.removed.length})`);
  if (result.removed.length === 0) {
    lines.push("  (none)");
  } else {
    for (const item of result.removed) {
      lines.push(`  - ${item.projectName}`);
    }
  }
  lines.push("");

  lines.push(`Changed (${result.changed.length})`);
  if (result.changed.length === 0) {
    lines.push("  (none)");
  } else {
    for (const entry of result.changed) {
      lines.push(`  ${entry.projectName}`);
      for (const field of entry.fields) {
        lines.push(`    ${field.field}`);
        lines.push(`      before: ${formatValue(field.before)}`);
        lines.push(`      after:  ${formatValue(field.after)}`);
      }
    }
  }

  return lines.join("\n");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(empty)";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}
