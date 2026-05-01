import { Document, HeadingLevel, Paragraph, TextRun } from "docx";

import { tierLabel } from "@/lib/enums/tier";

/**
 * Server-side compliance briefing — Word document listing every project
 * with a governance gap. The route at
 * `app/api/portfolios/exports/compliance-briefing/route.ts` does the
 * Sanity fetch and auth resolve; this module is the pure document
 * builder. Spec: openspec/specs/exports/spec.md.
 */

export interface CompliancePerson {
  name: string | null;
  email: string | null;
}

export interface ComplianceProject {
  _id: string;
  name: string;
  deliveryOwner: CompliancePerson | null;
  governanceTier: number | null;
  dpiaInPlace: string | null;
  actsInPlace: string | null;
  mojEthicsFrameworkUse: string | null;
}

/**
 * A project counts as missing an assurance when the value is null/empty,
 * "missing", or "unknown". "in-progress" is *not* a gap (it's tracked
 * progress) and "complete" / "yes" / "no" / "not-required" are explicitly
 * complete.
 */
export function isAssuranceGap(value: string | null | undefined): boolean {
  if (!value) return true;
  return value === "missing" || value === "unknown";
}

export function isEthicsGap(value: string | null | undefined): boolean {
  if (!value) return true;
  return value === "unknown";
}

function projectLine(project: ComplianceProject): Paragraph {
  const owner = project.deliveryOwner?.name ?? "No delivery owner";
  return new Paragraph({
    bullet: { level: 0 },
    children: [
      new TextRun({ text: project.name, bold: true }),
      new TextRun(` — owner: ${owner} — /portfolio/${project._id}`),
    ],
  });
}

function gapSection(
  heading: string,
  projects: ComplianceProject[],
  empty: string,
): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun(heading)],
    }),
  ];
  if (projects.length === 0) {
    out.push(new Paragraph({ children: [new TextRun(empty)] }));
    return out;
  }
  for (const project of projects) {
    out.push(projectLine(project));
  }
  return out;
}

export function buildComplianceBriefing(
  projects: ComplianceProject[],
): Document {
  const missingDpia = projects.filter((p) => isAssuranceGap(p.dpiaInPlace));
  const missingAtrs = projects.filter((p) => isAssuranceGap(p.actsInPlace));
  const missingEthics = projects.filter((p) =>
    isEthicsGap(p.mojEthicsFrameworkUse),
  );
  const missingTier = projects.filter((p) => p.governanceTier == null);

  const today = new Date().toISOString().slice(0, 10);
  const noGaps = "No projects missing this assurance.";

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Compliance briefing")],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated ${today} from ${projects.length} project${projects.length === 1 ? "" : "s"}.`,
          italics: true,
        }),
      ],
    }),
    ...gapSection("Projects missing a DPIA", missingDpia, noGaps),
    ...gapSection("Projects missing ATRS", missingAtrs, noGaps),
    ...gapSection(
      "Projects missing an ethics framework declaration",
      missingEthics,
      noGaps,
    ),
    ...gapSection(
      `Projects with governance tier unset (currently ${tierLabel(null)})`,
      missingTier,
      noGaps,
    ),
  ];

  return new Document({
    creator: "DTS Crime Portfolio",
    title: "Compliance briefing",
    sections: [{ children }],
  });
}

/**
 * Test introspection: return the heading text in document order so we can
 * assert section presence without parsing the docx archive.
 */
export const COMPLIANCE_SECTION_HEADINGS = [
  "Projects missing a DPIA",
  "Projects missing ATRS",
  "Projects missing an ethics framework declaration",
  // tier heading uses the live label so consumers can render it in sync
];

export function complianceTierHeading(): string {
  return `Projects with governance tier unset (currently ${tierLabel(null)})`;
}
