/**
 * Format a project's `lastUpdatedAt` value for the portfolio card footer.
 * Returns "No updates yet" when the value is missing, otherwise
 * "Last updated dd/mm/yyyy" per openspec/specs/portfolio-management/spec.md
 * (Default view).
 */
export function formatLastUpdatedFooter(lastUpdatedAt: string | null | undefined): string {
  if (!lastUpdatedAt) return "No updates yet";
  const parsed = new Date(lastUpdatedAt);
  if (Number.isNaN(parsed.getTime())) return "No updates yet";
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getUTCFullYear();
  return `Last updated ${dd}/${mm}/${yyyy}`;
}

/**
 * Truncate a description for the portfolio card. The full description is
 * shown in the dossier; the card shows a single-paragraph snippet.
 */
export function truncateDescription(description: string | null | undefined, max = 180): string {
  if (!description) return "";
  const trimmed = description.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
