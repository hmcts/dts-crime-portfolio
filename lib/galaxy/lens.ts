import type { GalaxyLens, GalaxyProject } from "./types";

/**
 * Lens → cluster-id mapping for a single project. Pure helper isolated
 * from `lenses.ts` (which builds the full cluster list with colours and
 * labels) so the simulation can be fed a flat
 * `{ id, clusterId }[]` derived from this. Spec:
 * openspec/specs/galaxy-view/spec.md.
 *
 * Each lens picks one cluster per project (1:1 assignment — the force
 * simulation cannot place a node at two centroids). Multi-valued fields
 * (business areas) collapse to their alphabetically-first entry, which
 * mirrors `lenses.ts`.
 */

export const UNCATEGORISED_CLUSTER_ID = "__none__";

export function clusterIdForProject(
  project: GalaxyProject,
  lens: GalaxyLens,
): string {
  switch (lens) {
    case "capability":
      return project.capability?._id ?? UNCATEGORISED_CLUSTER_ID;
    case "stage":
      return project.projectStage ?? UNCATEGORISED_CLUSTER_ID;
    case "business-area": {
      const sorted = [...project.businessAreas].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      return sorted[0]?._id ?? UNCATEGORISED_CLUSTER_ID;
    }
    case "delivery-area":
      return project.directorate?._id ?? UNCATEGORISED_CLUSTER_ID;
    case "governance": {
      const body = project.governanceBody?.trim();
      return body ? body : UNCATEGORISED_CLUSTER_ID;
    }
  }
}

/**
 * Return one cluster-id per project for the given lens. Useful when
 * feeding the simulation, which needs an array shape rather than a map.
 */
export function clusterIdsForLens(
  projects: GalaxyProject[],
  lens: GalaxyLens,
): { id: string; clusterId: string }[] {
  return projects.map((project) => ({
    id: project._id,
    clusterId: clusterIdForProject(project, lens),
  }));
}
