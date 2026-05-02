import "server-only";

import { getSanityClient } from "@/lib/sanity/client";
import type { GalaxyProject } from "./types";

/**
 * Server-only fetcher for the galaxy view. One GROQ query returns every
 * project with the fields each lens, overlay, and filter needs. Spec:
 * openspec/specs/galaxy-view/spec.md.
 */
const GALAXY_LIST_QUERY = /* groq */ `
  *[_type == "project"] | order(name asc) {
    _id,
    name,
    projectStage,
    "capability": capability->{ _id, name },
    "businessAreas": businessAreas[]->{ _id, name },
    "directorate": directorate->{ _id, name },
    governanceBody,
    riskRegister,
    dpiaInPlace,
    lastUpdatedAt
  }
`;

export async function listGalaxyProjects(): Promise<GalaxyProject[]> {
  const client = getSanityClient();
  return client.fetch<GalaxyProject[]>(GALAXY_LIST_QUERY);
}
