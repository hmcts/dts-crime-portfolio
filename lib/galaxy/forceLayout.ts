/**
 * Compatibility shim that adapts the lower-level `simulation` module to
 * the names `GalaxyView` expects. We render via the shared simulation
 * (Verlet integrator) but the View was wired earlier in the build to a
 * `buildForceLayout(clusters, width, height)` API. This module bridges
 * them. The `layout.{width,height,stars,clusters}` fields below match
 * `SimulationOutput` exactly so the existing canvas / fallback / legend
 * code keeps working.
 */
import type { GalaxyCluster } from "./lenses";
import { runSimulation, type SimulationOutput, type PositionedCluster } from "./simulation";

export type ForceLayout = SimulationOutput;
export type PositionedClusterCentroid = PositionedCluster;

export function buildForceLayout(
  clusters: GalaxyCluster[],
  width: number,
  height: number,
): ForceLayout {
  const stars = clusters.flatMap((cluster) =>
    cluster.projects.map((project) => ({
      id: project._id,
      clusterId: cluster.key,
    })),
  );
  const simulationClusters = clusters.map((cluster) => ({
    id: cluster.key,
    label: cluster.label,
  }));
  return runSimulation({
    stars,
    clusters: simulationClusters,
    width,
    height,
  });
}
