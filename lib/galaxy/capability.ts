/**
 * 2D canvas feature detection for the galaxy view. Tested in isolation
 * via `tests/galaxy-capability.test.ts` so the predicate is pure. Spec:
 * openspec/specs/galaxy-view/spec.md (Static-SVG fallback).
 */

export interface CanvasCapabilityProbe {
  /**
   * Optional document used to construct the probe `<canvas>`. Tests pass
   * a stub; runtime defaults to `globalThis.document`.
   */
  doc?: Pick<Document, "createElement"> | null;
}

/**
 * Returns true when the environment can render a 2D canvas. WebGL is not
 * required — `d3-force` writes to a 2D context. Returns false during
 * server-side rendering (no `document`).
 */
export function supportsCanvas2d({ doc }: CanvasCapabilityProbe = {}): boolean {
  const target = doc ?? (typeof document === "undefined" ? null : document);
  if (!target) return false;
  let element: HTMLCanvasElement;
  try {
    element = target.createElement("canvas") as HTMLCanvasElement;
  } catch {
    return false;
  }
  if (!element || typeof element.getContext !== "function") return false;
  try {
    return Boolean(element.getContext("2d"));
  } catch {
    return false;
  }
}
