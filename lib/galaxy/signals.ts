import type { GalaxyOverlay, GalaxyProject } from "./types";

/**
 * Pure overlay predicates for the galaxy canvas. Each predicate returns
 * true when the project should be highlighted by that overlay. Spec:
 * openspec/specs/galaxy-view/spec.md (Signal overlays).
 *
 * `now` is injected so tests can pin the clock without mocking
 * `Date.now`.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function hasComplianceGap(project: GalaxyProject): boolean {
  const missingRiskRegister =
    !project.riskRegister || project.riskRegister === "no" || project.riskRegister === "unknown";
  const missingDpia = !project.dpiaInPlace || project.dpiaInPlace === "missing";
  return missingRiskRegister || missingDpia;
}

export function wasUpdatedWithin(
  project: GalaxyProject,
  days: number,
  now: Date = new Date(),
): boolean {
  if (!project.lastUpdatedAt) return false;
  const updated = Date.parse(project.lastUpdatedAt);
  if (Number.isNaN(updated)) return false;
  return now.getTime() - updated <= days * ONE_DAY_MS;
}

export function hasNoUpdateFor(
  project: GalaxyProject,
  days: number,
  now: Date = new Date(),
): boolean {
  if (!project.lastUpdatedAt) return true;
  const updated = Date.parse(project.lastUpdatedAt);
  if (Number.isNaN(updated)) return true;
  return now.getTime() - updated > days * ONE_DAY_MS;
}

export function projectMatchesOverlay(
  project: GalaxyProject,
  overlay: GalaxyOverlay,
  now: Date = new Date(),
): boolean {
  switch (overlay) {
    case "compliance-gaps":
      return hasComplianceGap(project);
    case "updated-7d":
      return wasUpdatedWithin(project, 7, now);
    case "no-update-30d":
      return hasNoUpdateFor(project, 30, now);
  }
}

export function activeOverlaysForProject(
  project: GalaxyProject,
  overlays: readonly GalaxyOverlay[],
  now: Date = new Date(),
): GalaxyOverlay[] {
  return overlays.filter((overlay) => projectMatchesOverlay(project, overlay, now));
}
