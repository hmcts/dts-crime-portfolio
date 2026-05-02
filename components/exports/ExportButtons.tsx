import type { PortfolioListItem } from "@/lib/portfolio/types";

import { ExportComplianceLink } from "./ExportComplianceLink";
import { ExportOwnershipButton } from "./ExportOwnershipButton";
import { ExportPortfolioButton } from "./ExportPortfolioButton";

interface ExportButtonsProps {
  projects: PortfolioListItem[];
}

/**
 * Server component that mounts the export entry points in the portfolio
 * page header:
 *   - Excel (full)              — client-side via `exceljs`
 *   - Excel (PII redacted)      — client-side via `exceljs`
 *   - Word ownership (dropdown) — client-side via `docx`
 *   - Compliance briefing       — server-side via `docx` (audit context)
 *
 * The heavy client libs are loaded via dynamic `import()` inside each
 * button so they never appear in the initial bundle. PowerPoint summary
 * is deferred — `pptxgenjs@4` pulls `node:https` and can't bundle for
 * the browser. See openspec/specs/exports/spec.md.
 */
export function ExportButtons({ projects }: ExportButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ExportPortfolioButton projects={projects} />
      <ExportPortfolioButton projects={projects} redacted />
      <ExportOwnershipButton projects={projects} />
      <ExportComplianceLink />
    </div>
  );
}
