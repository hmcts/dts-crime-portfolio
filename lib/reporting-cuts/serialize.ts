import "server-only";

import type { SanityClient } from "@sanity/client";

/**
 * Shape of a single project as serialised into a ReportingCut snapshot. All
 * references are pre-resolved to readable text (names, emails, etc.) so that
 * the snapshot still reads correctly after referenced documents are renamed
 * or deleted.
 *
 * Spec: openspec/specs/compare-mode/spec.md (Snapshots capture resolved text).
 */
export interface SerialisedProject {
  _id: string;
  name: string;
  description: string | null;
  projectStage: string | null;
  group: string | null;
  directorate: string | null;
  businessAreas: string[] | null;
  deliveryOwner: { name: string; email: string } | null;
  additionalDeliveryOwners: { name: string; email: string }[] | null;
  businessLead: { name: string; email: string } | null;
  legalLead: { name: string; email: string } | null;
  capability: string | null;
  additionalCapabilities: string[] | null;
  actionPlanLinks: { actionNo: string; name: string }[] | null;
  governanceTier: number | null;
  governanceBody: string | null;
  riskRegister: string | null;
  dpiaInPlace: string | null;
  actsInPlace: string | null;
  mojEthicsFrameworkUse: string | null;
  githubUrl: string | null;
  lastUpdatedAt: string | null;
}

/**
 * GROQ that pre-resolves every reference on a project so the snapshot is
 * self-contained.
 */
export const SNAPSHOT_QUERY = /* groq */ `
  *[_type == "project"] | order(name asc) {
    _id,
    name,
    description,
    projectStage,
    "group": group->name,
    "directorate": directorate->name,
    "businessAreas": businessAreas[]->name,
    "deliveryOwner": deliveryOwner->{ name, email },
    "additionalDeliveryOwners": additionalDeliveryOwners[]->{ name, email },
    "businessLead": businessLead->{ name, email },
    "legalLead": legalLead->{ name, email },
    "capability": capability->name,
    "additionalCapabilities": additionalCapabilities[]->name,
    "actionPlanLinks": actionPlanLinks[]->{ actionNo, name },
    governanceTier,
    governanceBody,
    riskRegister,
    dpiaInPlace,
    actsInPlace,
    mojEthicsFrameworkUse,
    githubUrl,
    lastUpdatedAt
  }
`;

/**
 * Query every project, inline all reference text, and return the list as
 * a JSON-encoded string suitable for the `snapshot` field on a
 * `reportingCut` document.
 */
export async function serializePortfolioForSnapshot(
  client: SanityClient,
): Promise<string> {
  const projects = await client.fetch<SerialisedProject[]>(SNAPSHOT_QUERY);
  return JSON.stringify(projects ?? []);
}

/** Inverse of {@link serializePortfolioForSnapshot}. */
export function deserialiseSnapshot(raw: string): SerialisedProject[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as SerialisedProject[];
}
