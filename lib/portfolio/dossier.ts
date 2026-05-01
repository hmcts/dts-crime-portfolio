import "server-only";

import type { PortableTextBlock } from "@portabletext/types";

import type { Stage } from "@/lib/enums/stage";
import type { Tier } from "@/lib/enums/tier";
import { getSanityClient } from "@/lib/sanity/client";

export interface DossierPerson {
  name: string;
  email: string;
}

export interface DossierGroup {
  _id: string;
  name: string;
}

export interface DossierDirectorate {
  _id: string;
  name: string;
  group: DossierGroup | null;
}

export interface DossierBusinessArea {
  _id: string;
  name: string;
}

export interface DossierCapability {
  _id: string;
  name: string;
}

export interface DossierActionLink {
  _id: string;
  actionNo: string;
  name: string;
  strand: string;
}

export interface DossierUpdate {
  _key?: string;
  title: string | null;
  body: PortableTextBlock[] | null;
  authorEmail: string | null;
  timestamp: string | null;
}

export type AssuranceStatus = "complete" | "in-progress" | "not-required" | "missing" | null;
export type RiskRegisterValue = "yes" | "no" | "unknown" | null;
export type EthicsFrameworkValue = "yes" | "no" | "in-progress" | "unknown" | null;

export interface ProjectDossier {
  _id: string;
  name: string;
  description: string | null;
  projectStage: Stage;
  group: DossierGroup | null;
  directorate: DossierDirectorate | null;
  businessAreas: DossierBusinessArea[] | null;
  deliveryOwner: DossierPerson | null;
  additionalDeliveryOwners: DossierPerson[] | null;
  businessLead: DossierPerson | null;
  legalLead: DossierPerson | null;
  capability: DossierCapability | null;
  additionalCapabilities: DossierCapability[] | null;
  actionPlanLinks: DossierActionLink[] | null;
  governanceTier: Tier | null;
  governanceBody: string | null;
  riskRegister: RiskRegisterValue;
  dpiaInPlace: AssuranceStatus;
  actsInPlace: AssuranceStatus;
  mojEthicsFrameworkUse: EthicsFrameworkValue;
  githubUrl: string | null;
  updates: DossierUpdate[] | null;
  lastUpdatedAt: string | null;
}

const DOSSIER_QUERY = /* groq */ `
  *[_type == "project" && _id == $id][0] {
    _id,
    name,
    description,
    projectStage,
    "group": group->{ _id, name },
    "directorate": directorate->{ _id, name, "group": group->{ _id, name } },
    "businessAreas": businessAreas[]->{ _id, name },
    "deliveryOwner": deliveryOwner->{ name, email },
    "additionalDeliveryOwners": additionalDeliveryOwners[]->{ name, email },
    "businessLead": businessLead->{ name, email },
    "legalLead": legalLead->{ name, email },
    "capability": capability->{ _id, name },
    "additionalCapabilities": additionalCapabilities[]->{ _id, name },
    "actionPlanLinks": actionPlanLinks[]->{ _id, actionNo, name, strand },
    governanceTier,
    governanceBody,
    riskRegister,
    dpiaInPlace,
    actsInPlace,
    mojEthicsFrameworkUse,
    githubUrl,
    updates[]{ _key, title, body, authorEmail, timestamp },
    lastUpdatedAt
  }
`;

export async function fetchProjectDossier(id: string): Promise<ProjectDossier | null> {
  const client = getSanityClient();
  return client.fetch<ProjectDossier | null>(DOSSIER_QUERY, { id });
}
