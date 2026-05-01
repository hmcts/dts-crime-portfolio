"use client";

import { useState } from "react";

import type { PortfolioExportProject } from "@/lib/exports/excelPortfolio";

import { downloadBlob, todayStamp } from "./downloadBlob";

interface ExportPortfolioButtonProps {
  projects: PortfolioExportProject[];
  redacted?: boolean;
}

/**
 * Excel portfolio export button. Loads `exceljs` and the workbook builder
 * via dynamic `import()` so they only ship in the chunk that runs on
 * click — never in the initial bundle.
 *
 * Renders one button; the caller wires the redacted variant by mounting
 * a second instance with `redacted`.
 */
export function ExportPortfolioButton({
  projects,
  redacted = false,
}: ExportPortfolioButtonProps) {
  const [busy, setBusy] = useState(false);
  const count = projects.length;
  const label = redacted
    ? `Export Excel (PII redacted) (${count})`
    : `Export Excel (${count})`;

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      // Dynamic import keeps the heavy `exceljs` lib out of the initial
      // bundle — we only fetch it when the user actually exports.
      const { buildPortfolioWorkbook } = await import(
        "@/lib/exports/excelPortfolio"
      );
      const workbook = buildPortfolioWorkbook(projects, { redacted });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const suffix = redacted ? "redacted" : "full";
      downloadBlob(blob, `portfolio-${suffix}-${todayStamp()}.xlsx`);
    } catch (error) {
      // TODO observability
      console.error("excel export failed", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Generating…" : label}
    </button>
  );
}
