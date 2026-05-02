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
 * Render the card byline date — abbreviated "Jul 31, 2025" — to match
 * the redesigned card. Defaults to "Recently" if the input is missing
 * or unparsable rather than blowing up the layout.
 */
export function formatPromptByline(value: string | null | undefined): string {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  const month = parsed.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const dd = parsed.getUTCDate();
  const yyyy = parsed.getUTCFullYear();
  return `${month} ${dd}, ${yyyy}`;
}

/**
 * Format a timestamp as "12h ago" / "152d ago" — used in the
 * comments modal next to the commenter's name. Resolution is hours
 * for anything younger than a day, then days. We never show
 * minutes/seconds because the seeded data is week-grained and the
 * extra precision would feel fake.
 *
 * Returns "just now" for anything with a non-positive delta — clock
 * skew between client and server can otherwise produce nonsense.
 */
export function formatRelativeTimeAgo(
  value: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "recently";
  const deltaMs = now.getTime() - parsed.getTime();
  if (deltaMs <= 0) return "just now";
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    if (minutes <= 1) return "just now";
    return `${minutes}m ago`;
  }
  const hours = Math.floor(deltaMs / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(deltaMs / 86_400_000);
  return `${days}d ago`;
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
