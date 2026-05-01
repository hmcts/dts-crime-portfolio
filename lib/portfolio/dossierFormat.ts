/**
 * Format an update timestamp as `dd/mm/yyyy HH:mm` per
 * openspec/specs/project-dossier/spec.md (Updates timeline).
 */
export function formatUpdateTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return "";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getUTCFullYear();
  const hh = String(parsed.getUTCHours()).padStart(2, "0");
  const mn = String(parsed.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
}

export type AssuranceTone = "ok" | "warn" | "missing";

export interface AssuranceVerdict {
  tone: AssuranceTone;
  label: string;
  detail?: string;
}

const ASSURANCE_LABELS: Record<string, string> = {
  complete: "Complete",
  "in-progress": "In progress",
  "not-required": "Not required",
  missing: "Missing",
  yes: "Yes",
  no: "No",
  unknown: "Unknown",
};

/**
 * Map a stored assurance/governance value to the dossier display tone.
 * "complete" / "yes" / "no" / "not-required" → ok (green tick)
 * "in-progress" → warn (amber dashed)
 * "missing" / "unknown" / null → missing (neutral dashed)
 *
 * Spec: openspec/specs/project-dossier/spec.md (Compliance signal /
 * Compliance gap).
 */
export function assuranceVerdict(value: string | null | undefined): AssuranceVerdict {
  if (!value) return { tone: "missing", label: "Not yet recorded" };
  const label = ASSURANCE_LABELS[value] ?? value;
  if (value === "complete" || value === "yes" || value === "no" || value === "not-required") {
    return { tone: "ok", label };
  }
  if (value === "in-progress") {
    return { tone: "warn", label };
  }
  if (value === "missing" || value === "unknown") {
    return { tone: "missing", label };
  }
  return { tone: "missing", label };
}
