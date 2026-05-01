import ExcelJS from "exceljs";

import { STAGE_LABELS } from "@/lib/enums/stage";
import { tierLabel } from "@/lib/enums/tier";
import type { PortfolioListItem } from "@/lib/portfolio/types";

/**
 * Excel exports for the filtered portfolio. All generation runs client-side
 * from already-fetched data — see openspec/specs/exports/spec.md.
 *
 * The portfolio list query (lib/portfolio/queries.ts) currently surfaces a
 * subset of the spec'd columns. To keep the column shape correct without
 * mutating the shared `PortfolioListItem` type we accept a permissive
 * superset here: extra fields (business lead, legal lead, governance tier,
 * dpia, atrs, ethics framework) populate when the caller can supply them
 * and render blank otherwise. Once the list query is widened those columns
 * fill automatically with no caller change.
 */

export interface PortfolioWorkbookOptions {
  /**
   * When true, omit every column that contains an email address. Used for
   * "Export to Excel (PII redacted)" — see PII-redacted variant in the
   * spec. Email columns are removed entirely, not blanked.
   */
  redacted: boolean;
}

export interface PortfolioExportProject extends PortfolioListItem {
  businessLead?: { name: string | null; email: string | null } | null;
  legalLead?: { name: string | null; email: string | null } | null;
  governanceTier?: 1 | 2 | 3 | null;
  dpiaInPlace?: string | null;
  actsInPlace?: string | null;
  mojEthicsFrameworkUse?: string | null;
}

interface PortfolioColumn {
  header: string;
  key: string;
  width: number;
  // True if the column contains an email address. Skipped when redacted.
  isEmail?: boolean;
  value: (project: PortfolioExportProject) => string | number | null;
}

const PORTFOLIO_COLUMNS: PortfolioColumn[] = [
  { header: "Name", key: "name", width: 36, value: (p) => p.name },
  {
    header: "Description",
    key: "description",
    width: 60,
    value: (p) => p.description ?? "",
  },
  {
    header: "Stage",
    key: "stage",
    width: 12,
    value: (p) => STAGE_LABELS[p.projectStage] ?? p.projectStage,
  },
  { header: "Group", key: "group", width: 24, value: (p) => p.group ?? "" },
  {
    header: "Directorate",
    key: "directorate",
    width: 24,
    value: (p) => p.directorate ?? "",
  },
  {
    header: "Business areas",
    key: "businessAreas",
    width: 32,
    value: (p) => (p.businessAreas ?? []).join("; "),
  },
  {
    header: "Delivery owner",
    key: "deliveryOwner",
    width: 28,
    value: (p) => p.deliveryOwner?.name ?? "",
  },
  {
    header: "Delivery owner email",
    key: "deliveryOwnerEmail",
    width: 32,
    isEmail: true,
    value: (p) => p.deliveryOwner?.email ?? "",
  },
  {
    header: "Business lead",
    key: "businessLead",
    width: 28,
    value: (p) => p.businessLead?.name ?? "",
  },
  {
    header: "Business lead email",
    key: "businessLeadEmail",
    width: 32,
    isEmail: true,
    value: (p) => p.businessLead?.email ?? "",
  },
  {
    header: "Legal lead",
    key: "legalLead",
    width: 28,
    value: (p) => p.legalLead?.name ?? "",
  },
  {
    header: "Legal lead email",
    key: "legalLeadEmail",
    width: 32,
    isEmail: true,
    value: (p) => p.legalLead?.email ?? "",
  },
  {
    header: "Capability",
    key: "capability",
    width: 24,
    value: (p) => p.capability ?? "",
  },
  {
    header: "Governance tier",
    key: "governanceTier",
    width: 18,
    value: (p) => tierLabel(p.governanceTier ?? null),
  },
  {
    header: "DPIA",
    key: "dpia",
    width: 18,
    value: (p) => p.dpiaInPlace ?? "",
  },
  {
    header: "ATRS",
    key: "atrs",
    width: 18,
    value: (p) => p.actsInPlace ?? "",
  },
  {
    header: "Ethics framework",
    key: "ethics",
    width: 22,
    value: (p) => p.mojEthicsFrameworkUse ?? "",
  },
  {
    header: "Last updated",
    key: "lastUpdated",
    width: 22,
    value: (p) => p.lastUpdatedAt ?? "",
  },
];

export function buildPortfolioWorkbook(
  projects: PortfolioExportProject[],
  options: PortfolioWorkbookOptions,
): ExcelJS.Workbook {
  const { redacted } = options;
  const columns = PORTFOLIO_COLUMNS.filter(
    (column) => !(redacted && column.isEmail),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.creator = "DTS Crime Portfolio";
  const sheet = workbook.addWorksheet("Portfolio");
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const project of projects) {
    const row: Record<string, string | number | null> = {};
    for (const column of columns) {
      row[column.key] = column.value(project);
    }
    sheet.addRow(row);
  }

  return workbook;
}

/**
 * Column-shape introspection helper — used by tests to assert that the
 * redacted variant truly omits every email column.
 */
export function portfolioWorkbookHeaders(
  options: PortfolioWorkbookOptions = { redacted: false },
): string[] {
  const { redacted } = options;
  return PORTFOLIO_COLUMNS.filter(
    (column) => !(redacted && column.isEmail),
  ).map((column) => column.header);
}
