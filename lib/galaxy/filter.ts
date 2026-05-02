import type { GalaxyProject } from "./types";
import type { GalaxyUrlState } from "./url";

/**
 * Apply the URL-driven filter and search to the list of projects. Pure
 * helper so the same filter runs in tests and in the canvas client. Spec:
 * openspec/specs/galaxy-view/spec.md (Search and shared filters).
 *
 * Stars not matching the filter are *hidden* (not greyed). Search is
 * case-insensitive and matches against the project name only — capability
 * search is implicit via the capability filter.
 */
export function filterGalaxyProjects(
  projects: GalaxyProject[],
  state: Pick<
    GalaxyUrlState,
    "search" | "stages" | "capabilityIds" | "businessAreaIds" | "directorateIds"
  >,
): GalaxyProject[] {
  const search = state.search.toLowerCase();
  return projects.filter((project) => {
    if (search && !project.name.toLowerCase().includes(search)) {
      return false;
    }
    if (state.stages.length > 0) {
      if (!project.projectStage || !state.stages.includes(project.projectStage)) {
        return false;
      }
    }
    if (state.capabilityIds.length > 0) {
      if (!project.capability || !state.capabilityIds.includes(project.capability._id)) {
        return false;
      }
    }
    if (state.businessAreaIds.length > 0) {
      const ids = project.businessAreas.map((b) => b._id);
      if (!state.businessAreaIds.some((id) => ids.includes(id))) {
        return false;
      }
    }
    if (state.directorateIds.length > 0) {
      if (!project.directorate || !state.directorateIds.includes(project.directorate._id)) {
        return false;
      }
    }
    return true;
  });
}
