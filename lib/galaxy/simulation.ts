/**
 * Pure, deterministic 2D force-directed layout for the galaxy canvas.
 *
 * The simulation is a small Verlet-style integrator written by hand —
 * see openspec/specs/galaxy-view/spec.md for why we don't pull in a
 * physics dependency. Per-tick forces:
 *
 *   1. Cluster cohesion: each star is pulled toward its cluster centroid
 *      with a linear spring (Hooke's law).
 *   2. Pairwise repulsion: every star repels every other star (Coulomb
 *      style 1/r^2 falloff) so dense clusters spread out instead of
 *      collapsing onto the centroid.
 *   3. Cluster separation: centroids themselves repel each other so
 *      clusters drift apart and become visually distinguishable.
 *
 * The layout is seedable: starting positions are sampled from a tiny
 * mulberry32 PRNG keyed by the seed, so two runs with the same inputs
 * produce identical outputs. Tests rely on this.
 */

export interface SimulationStar {
  id: string;
  clusterId: string;
}

export interface SimulationCluster {
  id: string;
  label?: string;
}

export interface SimulationInput {
  stars: SimulationStar[];
  clusters: SimulationCluster[];
  /** Logical canvas width. */
  width?: number;
  /** Logical canvas height. */
  height?: number;
  /** Number of integration steps. */
  ticks?: number;
  /** PRNG seed for the initial positions. */
  seed?: number;
}

export interface PositionedStar {
  id: string;
  x: number;
  y: number;
  clusterId: string;
}

export interface PositionedCluster {
  id: string;
  x: number;
  y: number;
  /** Smallest enclosing radius after the simulation settles. */
  radius: number;
}

export interface SimulationOutput {
  width: number;
  height: number;
  stars: PositionedStar[];
  clusters: PositionedCluster[];
}

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;
const DEFAULT_TICKS = 240;
const DEFAULT_SEED = 1;

/** Star radius used when computing cluster bounding circles. */
export const STAR_RADIUS = 6;

const COHESION_STRENGTH = 0.04; // pull toward cluster centroid
const REPULSION_STRENGTH = 220; // star-to-star Coulomb constant
const REPULSION_MIN_DIST = 4; // softening to prevent singularities
const REPULSION_MAX_DIST = 80; // ignore far-away repulsion
const CLUSTER_SEPARATION = 6000; // centroid-to-centroid push
const VELOCITY_DAMPING = 0.86; // simple drag
const MAX_STEP = 12; // cap per-tick displacement

interface InternalNode {
  id: string;
  clusterId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface InternalCentroid {
  id: string;
  x: number;
  y: number;
}

/**
 * Run the simulation. Pure: same inputs always produce the same outputs.
 */
export function runSimulation(input: SimulationInput): SimulationOutput {
  const width = input.width ?? DEFAULT_WIDTH;
  const height = input.height ?? DEFAULT_HEIGHT;
  const ticks = input.ticks ?? DEFAULT_TICKS;
  const seed = input.seed ?? DEFAULT_SEED;

  const usedClusterIds = new Set(input.stars.map((s) => s.clusterId));
  const clusters = input.clusters.filter((c) => usedClusterIds.has(c.id));
  if (clusters.length === 0 || input.stars.length === 0) {
    return { width, height, stars: [], clusters: [] };
  }

  const centroids = layoutCentroids(clusters, width, height);
  const centroidById = new Map(centroids.map((c) => [c.id, c]));

  const random = mulberry32(seed);
  const nodes: InternalNode[] = input.stars
    .filter((star) => centroidById.has(star.clusterId))
    .map((star) => {
      const centre = centroidById.get(star.clusterId)!;
      // Tiny offset so nodes don't all stack on the centroid initially.
      const angle = random() * Math.PI * 2;
      const radius = 2 + random() * 30;
      return {
        id: star.id,
        clusterId: star.clusterId,
        x: centre.x + Math.cos(angle) * radius,
        y: centre.y + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

  for (let step = 0; step < ticks; step += 1) {
    tick(nodes, centroids, width, height);
  }

  const radiusByCluster = new Map<string, number>();
  for (const centre of centroids) {
    let maxDistSq = 0;
    for (const node of nodes) {
      if (node.clusterId !== centre.id) continue;
      const dx = node.x - centre.x;
      const dy = node.y - centre.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > maxDistSq) maxDistSq = distSq;
    }
    radiusByCluster.set(
      centre.id,
      Math.sqrt(maxDistSq) + STAR_RADIUS + 8,
    );
  }

  return {
    width,
    height,
    stars: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, clusterId: n.clusterId })),
    clusters: centroids.map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      radius: radiusByCluster.get(c.id) ?? STAR_RADIUS * 4,
    })),
  };
}

function tick(
  nodes: InternalNode[],
  centroids: InternalCentroid[],
  width: number,
  height: number,
): void {
  const centroidById = new Map(centroids.map((c) => [c.id, c]));

  // Cluster separation — adjust centroids so clusters drift apart.
  for (let i = 0; i < centroids.length; i += 1) {
    for (let j = i + 1; j < centroids.length; j += 1) {
      const a = centroids[i];
      const b = centroids[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 1) continue;
      const dist = Math.sqrt(distSq);
      const force = CLUSTER_SEPARATION / distSq;
      const fx = (dx / dist) * force * 0.0005;
      const fy = (dy / dist) * force * 0.0005;
      a.x -= fx;
      a.y -= fy;
      b.x += fx;
      b.y += fy;
    }
    centroids[i].x = clamp(centroids[i].x, width * 0.1, width * 0.9);
    centroids[i].y = clamp(centroids[i].y, height * 0.1, height * 0.9);
  }

  // Cohesion: spring-pull each node toward its cluster centroid.
  for (const node of nodes) {
    const centre = centroidById.get(node.clusterId);
    if (!centre) continue;
    node.vx += (centre.x - node.x) * COHESION_STRENGTH;
    node.vy += (centre.y - node.y) * COHESION_STRENGTH;
  }

  // Repulsion: pairwise inverse-square. O(n^2) is fine for our scale
  // (typically < 200 stars). Soften and cap so tiny distances don't
  // explode and far pairs don't waste cycles.
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      let distSq = dx * dx + dy * dy;
      if (distSq > REPULSION_MAX_DIST * REPULSION_MAX_DIST) continue;
      if (distSq < REPULSION_MIN_DIST * REPULSION_MIN_DIST) {
        distSq = REPULSION_MIN_DIST * REPULSION_MIN_DIST;
      }
      const dist = Math.sqrt(distSq);
      const force = REPULSION_STRENGTH / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  // Integrate with damping and a per-step displacement cap.
  for (const node of nodes) {
    node.vx *= VELOCITY_DAMPING;
    node.vy *= VELOCITY_DAMPING;
    let dx = node.vx;
    let dy = node.vy;
    const stepDist = Math.sqrt(dx * dx + dy * dy);
    if (stepDist > MAX_STEP) {
      dx = (dx / stepDist) * MAX_STEP;
      dy = (dy / stepDist) * MAX_STEP;
    }
    node.x += dx;
    node.y += dy;
    // Keep nodes inside the canvas.
    node.x = clamp(node.x, 4, width - 4);
    node.y = clamp(node.y, 4, height - 4);
  }
}

/**
 * Lay out cluster centroids on a roughly-square grid. Deterministic by
 * cluster ordering so the same inputs always yield the same layout.
 */
function layoutCentroids(
  clusters: SimulationCluster[],
  width: number,
  height: number,
): InternalCentroid[] {
  const count = clusters.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cellW = width / cols;
  const cellH = height / rows;
  return clusters.map((cluster, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      id: cluster.id,
      x: cellW * (col + 0.5),
      y: cellH * (row + 0.5),
    };
  });
}

/**
 * Tiny seedable PRNG (mulberry32). Returns a function producing values
 * in [0, 1). Used so the simulation is reproducible across runs.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
