import "server-only";

import type { Stage } from "@/lib/enums/stage";
import { getSanityClient } from "@/lib/sanity/client";

/**
 * Single project the signed-in user is connected to. Each role flag is
 * true when the user occupies that role on the project. Multiple flags
 * can be true on the same project (e.g. owner who is also business lead).
 */
export interface ProfileProject {
  _id: string;
  name: string;
  projectStage: Stage;
  isDeliveryOwner: boolean;
  isAdditionalDeliveryOwner: boolean;
  isBusinessLead: boolean;
  isLegalLead: boolean;
}

export const PROFILE_ROLES = [
  "deliveryOwner",
  "additionalDeliveryOwner",
  "businessLead",
  "legalLead",
] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const PROFILE_ROLE_LABELS: Record<ProfileRole, string> = {
  deliveryOwner: "Delivery owner",
  additionalDeliveryOwner: "Additional delivery owner",
  businessLead: "Business lead",
  legalLead: "Legal lead",
};

const PROFILE_QUERY = /* groq */ `
  *[_type == "project" && (
    deliveryOwner->email == $email
    || $email in additionalDeliveryOwners[]->email
    || businessLead->email == $email
    || legalLead->email == $email
  )] | order(name asc) {
    _id,
    name,
    projectStage,
    "isDeliveryOwner": deliveryOwner->email == $email,
    "isAdditionalDeliveryOwner": $email in additionalDeliveryOwners[]->email,
    "isBusinessLead": businessLead->email == $email,
    "isLegalLead": legalLead->email == $email
  }
`;

export async function fetchProfileProjects(email: string): Promise<ProfileProject[]> {
  const client = getSanityClient();
  return client.fetch<ProfileProject[]>(PROFILE_QUERY, { email });
}

/**
 * Group projects by role. A project shows up under every role it
 * matches. Spec: openspec/specs/profile-view/spec.md (Role grouping).
 */
export function groupProfileProjectsByRole(
  projects: ProfileProject[],
): Record<ProfileRole, ProfileProject[]> {
  const grouped: Record<ProfileRole, ProfileProject[]> = {
    deliveryOwner: [],
    additionalDeliveryOwner: [],
    businessLead: [],
    legalLead: [],
  };
  for (const project of projects) {
    if (project.isDeliveryOwner) grouped.deliveryOwner.push(project);
    if (project.isAdditionalDeliveryOwner) grouped.additionalDeliveryOwner.push(project);
    if (project.isBusinessLead) grouped.businessLead.push(project);
    if (project.isLegalLead) grouped.legalLead.push(project);
  }
  return grouped;
}
