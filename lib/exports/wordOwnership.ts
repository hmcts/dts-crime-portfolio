import { Document, HeadingLevel, Paragraph, TextRun } from "docx";

import { STAGE_LABELS } from "@/lib/enums/stage";
import type { PortfolioListItem } from "@/lib/portfolio/types";

/**
 * Word ownership report — groups projects by the named role and emits one
 * section per person. See openspec/specs/exports/spec.md (Word ownership
 * report).
 */

export type OwnershipRole = "deliveryOwner" | "businessLead" | "legalLead";

export const OWNERSHIP_ROLE_LABELS: Record<OwnershipRole, string> = {
  deliveryOwner: "Delivery owner",
  businessLead: "Business lead",
  legalLead: "Legal lead",
};

/**
 * Permissive input shape: the list query currently surfaces only the
 * delivery owner reference; business / legal lead support comes once the
 * query is widened. Accepting an optional superset means callers can pass
 * the existing `PortfolioListItem` array and the function copes.
 */
export interface OwnershipProject {
  _id: string;
  name: string;
  projectStage: PortfolioListItem["projectStage"];
  lastUpdatedAt: string | null;
  deliveryOwner?: { name: string; email?: string | null } | null;
  businessLead?: { name: string; email?: string | null } | null;
  legalLead?: { name: string; email?: string | null } | null;
}

interface PersonGroup {
  name: string;
  projects: OwnershipProject[];
}

function personFor(
  project: OwnershipProject,
  role: OwnershipRole,
): { name: string } | null {
  const person = project[role];
  if (!person) return null;
  if (!person.name) return null;
  return { name: person.name };
}

function groupByPerson(
  projects: OwnershipProject[],
  role: OwnershipRole,
): PersonGroup[] {
  const map = new Map<string, PersonGroup>();
  for (const project of projects) {
    const person = personFor(project, role);
    if (!person) continue;
    const existing = map.get(person.name);
    if (existing) {
      existing.projects.push(project);
    } else {
      map.set(person.name, { name: person.name, projects: [project] });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function formatLastUpdated(value: string | null): string {
  if (!value) return "Never updated";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function buildOwnershipDocument(
  projects: OwnershipProject[],
  role: OwnershipRole,
): Document {
  const groups = groupByPerson(projects, role);
  const roleLabel = OWNERSHIP_ROLE_LABELS[role];

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(`Ownership report — ${roleLabel}`)],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Grouped by ${roleLabel.toLowerCase()}.`,
          italics: true,
        }),
      ],
    }),
  ];

  if (groups.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun(`No projects have a ${roleLabel.toLowerCase()} assigned.`),
        ],
      }),
    );
  } else {
    for (const group of groups) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(group.name)],
        }),
      );
      const sortedProjects = [...group.projects].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const project of sortedProjects) {
        const stageLabel =
          STAGE_LABELS[project.projectStage] ?? project.projectStage;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: project.name, bold: true }),
              new TextRun(
                ` — ${stageLabel} — last updated ${formatLastUpdated(project.lastUpdatedAt)}`,
              ),
            ],
          }),
        );
      }
    }
  }

  return new Document({
    creator: "DTS Crime Portfolio",
    title: `Ownership report — ${roleLabel}`,
    sections: [{ children }],
  });
}
