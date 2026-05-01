import "server-only";

import { getSanityClient } from "@/lib/sanity/client";
import type { GalaxyProject } from "./types";

/**
 * Server-only fetcher for the v0 galaxy view. One GROQ query returns every
 * project with the minimum fields the SVG layout needs. Spec:
 * openspec/specs/galaxy-view/spec.md.
 */
const GALAXY_LIST_QUERY = /* groq */ `
  *[_type == "project"] | order(name asc) {
    _id,
    name,
    projectStage,
    "capability": capability->name
  }
`;

export async function listGalaxyProjects(): Promise<GalaxyProject[]> {
  const client = getSanityClient();
  return client.fetch<GalaxyProject[]>(GALAXY_LIST_QUERY);
}
