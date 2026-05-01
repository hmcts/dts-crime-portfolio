/**
 * Format the "Posted dd/mm/yyyy" string used in the prompt card byline.
 */
export function formatPromptDate(value: string | null | undefined): string {
  if (!value) return "Posted recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Posted recently";
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getUTCFullYear();
  return `Posted ${dd}/${mm}/${yyyy}`;
}

/**
 * Render `YYYY-MM` (per Sanity `competitionMonth`) as a friendly month
 * label such as "May 2026".
 */
export function formatCompetitionMonthLabel(month: string | null | undefined): string {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return "";
  const [yyyy, mm] = month.split("-");
  const index = Number(mm) - 1;
  if (index < 0 || index > 11) return "";
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[index]} ${yyyy}`;
}
