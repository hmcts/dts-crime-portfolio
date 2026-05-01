"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { supportsCanvas2d } from "@/lib/galaxy/capability";
import { filterGalaxyProjects } from "@/lib/galaxy/filter";
import { groupProjects } from "@/lib/galaxy/lenses";
import {
  buildForceLayout,
  type ForceLayout,
  type PositionedClusterCentroid,
} from "@/lib/galaxy/forceLayout";
import {
  DEFAULT_GALAXY_LENS,
  GALAXY_LENSES,
  GALAXY_OVERLAYS,
  type GalaxyLens,
  type GalaxyOverlay,
  type GalaxyProject,
} from "@/lib/galaxy/types";
import { parseGalaxyUrl, GALAXY_URL_KEYS } from "@/lib/galaxy/url";

import { GalaxyCanvas } from "./GalaxyCanvas";
import { GalaxyFallbackSvg } from "./GalaxyFallbackSvg";
import { GalaxyLegend } from "./GalaxyLegend";
import { GalaxyLensSelector } from "./GalaxyLensSelector";
import { GalaxyOverlayPanel } from "./GalaxyOverlayPanel";
import { GalaxySearchBox } from "./GalaxySearchBox";

/**
 * Top-level client component for `/galaxy`. Owns:
 *
 *  - URL state (lens, overlay, search, shared filters) via Next router
 *  - Per-lens force-layout cache so switching lenses is instant after
 *    the first compute
 *  - Camera focus actions (Reset, Focus cluster)
 *  - Capability detection for the static-SVG fallback
 *
 * The component is a thin orchestrator — pure layout, grouping, and
 * signal predicates live in `lib/galaxy/`. Spec:
 * openspec/specs/galaxy-view/spec.md.
 */

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

interface GalaxyViewProps {
  projects: GalaxyProject[];
}

interface FocusRequest {
  /** Cluster key to fit, or null to fit-all. */
  cluster: string | null;
  /** Monotonic id so re-clicking the same cluster still triggers an animation. */
  id: number;
}

export function GalaxyView({ projects }: GalaxyViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlState = useMemo(
    () => parseGalaxyUrl(searchParamsToObject(searchParams)),
    [searchParams],
  );

  const [canvasSupported, setCanvasSupported] = useState<boolean | null>(null);
  useEffect(() => {
    setCanvasSupported(supportsCanvas2d());
  }, []);

  const filteredProjects = useMemo(
    () => filterGalaxyProjects(projects, urlState),
    [projects, urlState],
  );

  const clusters = useMemo(
    () => groupProjects(filteredProjects, urlState.lens),
    [filteredProjects, urlState.lens],
  );

  // Cache layout per (lens + filtered project id signature) so the
  // simulation runs once. When filters change the signature changes and
  // the layout recomputes — that's the right behaviour because hidden
  // stars shouldn't influence cluster centres.
  const layoutCacheRef = useRef<Map<string, ForceLayout>>(new Map());
  const layout = useMemo(() => {
    const signature = `${urlState.lens}|${filteredProjects
      .map((p) => p._id)
      .join(",")}`;
    const cached = layoutCacheRef.current.get(signature);
    if (cached) return cached;
    const computed = buildForceLayout(clusters, CANVAS_WIDTH, CANVAS_HEIGHT);
    layoutCacheRef.current.set(signature, computed);
    return computed;
  }, [clusters, filteredProjects, urlState.lens]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showBorders, setShowBorders] = useState(false);
  const [uiMinimised, setUiMinimised] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest>({
    cluster: null,
    id: 0,
  });

  const focusReqIdRef = useRef(0);
  const requestFocus = useCallback((cluster: string | null) => {
    focusReqIdRef.current += 1;
    setFocusRequest({ cluster, id: focusReqIdRef.current });
  }, []);

  const setLens = useCallback(
    (lens: GalaxyLens) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (lens === DEFAULT_GALAXY_LENS) {
        params.delete(GALAXY_URL_KEYS.lens);
      } else {
        params.set(GALAXY_URL_KEYS.lens, lens);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?");
      });
      // Re-fit camera after a lens change.
      requestFocus(null);
    },
    [router, searchParams, requestFocus],
  );

  const toggleOverlay = useCallback(
    (overlay: GalaxyOverlay) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const current = (params.get(GALAXY_URL_KEYS.overlay) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const next = current.includes(overlay)
        ? current.filter((entry) => entry !== overlay)
        : GALAXY_OVERLAYS.filter((o) => o === overlay || current.includes(o));
      if (next.length === 0) {
        params.delete(GALAXY_URL_KEYS.overlay);
      } else {
        params.set(GALAXY_URL_KEYS.overlay, next.join(","));
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?");
      });
    },
    [router, searchParams],
  );

  const setSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value) {
        params.set(GALAXY_URL_KEYS.search, value);
      } else {
        params.delete(GALAXY_URL_KEYS.search);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?");
      });
    },
    [router, searchParams],
  );

  const fallback = canvasSupported === false;

  return (
    <div className="flex flex-col gap-4">
      {!uiMinimised && (
        <header className="flex flex-col gap-3 border-b border-neutral-200 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Galaxy view</h1>
            <p
              className="mt-1 text-sm text-neutral-600"
              data-testid="galaxy-counts"
            >
              {filteredProjects.length} star
              {filteredProjects.length === 1 ? "" : "s"} ·{" "}
              {clusters.filter((c) => c.projects.length > 0).length} constellation
              {clusters.filter((c) => c.projects.length > 0).length === 1 ? "" : "s"} ·{" "}
              {Math.round(zoom * 100)}%
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <GalaxySearchBox value={urlState.search} onChange={setSearch} />
            <GalaxyLensSelector activeLens={urlState.lens} onChange={setLens} />
          </div>
        </header>
      )}

      {!uiMinimised && (
        <GalaxyOverlayPanel
          activeOverlays={urlState.overlays}
          onToggle={toggleOverlay}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <section
          aria-label="Galaxy"
          className="relative flex-1 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-950"
        >
          {fallback ? (
            <GalaxyFallbackSvg
              projects={filteredProjects}
              clusters={clusters}
              layout={layout}
              overlays={urlState.overlays}
            />
          ) : (
            canvasSupported !== null && (
              <GalaxyCanvas
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                clusters={clusters}
                projects={filteredProjects}
                layout={layout}
                overlays={urlState.overlays}
                searchTerm={urlState.search ?? ""}
                zoom={zoom}
                onZoomChange={setZoom}
                pan={pan}
                onPanChange={setPan}
                showBorders={showBorders}
                focusRequest={focusRequest}
              />
            )
          )}
          {canvasSupported === null && (
            <div className="flex h-[480px] items-center justify-center text-sm text-neutral-400">
              Loading galaxy…
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-neutral-950/85 to-transparent p-3 text-xs text-neutral-200">
            <div className="pointer-events-auto flex items-center gap-2">
              <label className="flex items-center gap-2">
                <span className="uppercase tracking-wide text-neutral-400">Zoom</span>
                <input
                  aria-label="Zoom slider"
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.05}
                  value={zoom}
                  disabled={fallback}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="h-1 w-32 cursor-pointer accent-blue-400"
                />
              </label>
              <button
                type="button"
                disabled={fallback}
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  requestFocus(null);
                }}
                className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
              >
                Reset camera
              </button>
              <button
                type="button"
                disabled={fallback}
                onClick={() => setShowBorders((prev) => !prev)}
                className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
                aria-pressed={showBorders}
              >
                {showBorders ? "Hide borders" : "Show borders"}
              </button>
            </div>
            <div className="pointer-events-auto">
              <button
                type="button"
                onClick={() => setUiMinimised((prev) => !prev)}
                className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 hover:bg-neutral-800"
              >
                {uiMinimised ? "Restore UI" : "Minimise UI"}
              </button>
            </div>
          </div>
        </section>

        {!uiMinimised && (
          <GalaxyLegend
            clusters={clusters}
            onFocus={(key) => requestFocus(key)}
            onFocusAll={() => requestFocus(null)}
            disabled={fallback}
          />
        )}
      </div>
    </div>
  );
}

function searchParamsToObject(
  searchParams: ReturnType<typeof useSearchParams>,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!searchParams) return out;
  // `getAll` returns repeated values for a key.
  for (const key of Array.from(new Set(Array.from(searchParams.keys())))) {
    const all = searchParams.getAll(key);
    out[key] = all.length > 1 ? all : (all[0] ?? "");
  }
  return out;
}

export type { PositionedClusterCentroid };
export { GALAXY_LENSES };
