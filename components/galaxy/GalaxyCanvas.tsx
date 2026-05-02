"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { type GalaxyCluster } from "@/lib/galaxy/lenses";
import { activeOverlaysForProject } from "@/lib/galaxy/signals";
import { STAR_RADIUS, type SimulationOutput } from "@/lib/galaxy/simulation";
import {
  GALAXY_OVERLAY_COLORS,
  type GalaxyOverlay,
  type GalaxyProject,
} from "@/lib/galaxy/types";

/**
 * 2D canvas rendering for the galaxy. The simulation is precomputed in
 * `lib/galaxy/simulation.ts`; this component paints the static
 * positions and handles drag-to-pan / scroll-to-zoom / cluster-focus
 * animation. Spec: openspec/specs/galaxy-view/spec.md.
 */

interface FocusRequest {
  cluster: string | null;
  id: number;
}

interface GalaxyCanvasProps {
  width: number;
  height: number;
  projects: GalaxyProject[];
  clusters: GalaxyCluster[];
  layout: SimulationOutput;
  overlays: GalaxyOverlay[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  showBorders: boolean;
  searchTerm: string;
  focusRequest: FocusRequest;
}

interface NodeView {
  id: string;
  name: string;
  x: number;
  y: number;
  fill: string;
  rings: GalaxyOverlay[];
  dimmed: boolean;
  highlight: boolean;
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

export function GalaxyCanvas({
  width,
  height,
  projects,
  clusters,
  layout,
  overlays,
  zoom,
  onZoomChange,
  pan,
  onPanChange,
  showBorders,
  searchTerm,
  focusRequest,
}: GalaxyCanvasProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);

  const projectByIdRef = useRef(new Map<string, GalaxyProject>());
  projectByIdRef.current = useMemo(() => {
    const map = new Map<string, GalaxyProject>();
    for (const project of projects) map.set(project._id, project);
    return map;
  }, [projects]);

  const search = searchTerm.trim().toLowerCase();

  const nodeViews = useMemo<NodeView[]>(() => {
    const colorByCluster = new Map(clusters.map((c) => [c.key, c.color]));
    const projectByCluster = new Map<string, GalaxyCluster>();
    for (const cluster of clusters) {
      for (const project of cluster.projects) {
        projectByCluster.set(project._id, cluster);
      }
    }
    const overlaysActive = overlays.length > 0;
    const searching = search.length > 0;
    return layout.stars.map((node) => {
      const project = projectByIdRef.current.get(node.id);
      const cluster = projectByCluster.get(node.id);
      const fill = colorByCluster.get(node.clusterId) ?? "#94a3b8";
      const rings = project ? activeOverlaysForProject(project, overlays) : [];
      const matches =
        searching && project
          ? project.name.toLowerCase().includes(search)
          : false;
      return {
        id: node.id,
        name: project?.name ?? cluster?.label ?? "",
        x: node.x,
        y: node.y,
        fill,
        rings,
        dimmed:
          (overlaysActive && rings.length === 0) ||
          (searching && !matches),
        highlight: matches,
      };
    });
  }, [clusters, layout, overlays, search]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (canvas.width !== Math.floor(cssWidth * dpr)) {
      canvas.width = Math.floor(cssWidth * dpr);
    }
    if (canvas.height !== Math.floor(cssHeight * dpr)) {
      canvas.height = Math.floor(cssHeight * dpr);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Map logical layout space into the canvas. Centre the layout, then
    // apply user pan/zoom.
    const baseScale = Math.min(cssWidth / layout.width, cssHeight / layout.height);
    const scale = baseScale * zoom * dpr;
    const offsetX =
      (cssWidth * dpr - layout.width * scale) / 2 + pan.x * dpr;
    const offsetY =
      (cssHeight * dpr - layout.height * scale) / 2 + pan.y * dpr;

    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    if (showBorders) {
      ctx.lineWidth = 1 / scale;
      ctx.strokeStyle = "#475569";
      ctx.setLineDash([4 / scale, 6 / scale]);
      for (const cluster of layout.clusters) {
        ctx.beginPath();
        ctx.arc(cluster.x, cluster.y, cluster.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    for (const node of nodeViews) {
      ctx.globalAlpha = node.dimmed ? 0.2 : 1;
      ctx.beginPath();
      ctx.arc(node.x, node.y, STAR_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = node.fill;
      ctx.fill();
      ctx.lineWidth = 1 / scale;
      ctx.strokeStyle = "#0f172a";
      ctx.stroke();

      if (node.highlight) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, STAR_RADIUS + 4, 0, Math.PI * 2);
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = "#fef08a"; // yellow-200
        ctx.stroke();
      }

      // Overlay rings — concentric.
      let ringOffset = node.highlight ? 7 : 3;
      for (const overlay of node.rings) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, STAR_RADIUS + ringOffset, 0, Math.PI * 2);
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = GALAXY_OVERLAY_COLORS[overlay];
        ctx.stroke();
        ringOffset += 3;
      }
    }
    ctx.globalAlpha = 1;

    // Cluster labels.
    ctx.fillStyle = "#cbd5f5";
    ctx.font = `${12 / scale}px sans-serif`;
    ctx.textAlign = "center";
    for (const cluster of clusters) {
      const centre = layout.clusters.find((c) => c.id === cluster.key);
      if (!centre) continue;
      ctx.fillText(cluster.label, centre.x, centre.y - centre.radius - 6 / scale);
    }
  }, [clusters, layout, nodeViews, pan.x, pan.y, showBorders, zoom]);

  // Repaint whenever inputs change.
  useEffect(() => {
    draw();
  }, [draw]);

  // Repaint on resize.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(node);
    return () => observer.disconnect();
  }, [draw]);

  // Animate camera to the requested focus target.
  const animationRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = focusRequest.cluster
      ? layout.clusters.find((c) => c.id === focusRequest.cluster) ?? null
      : null;
    const fitWidth = layout.width;
    const fitHeight = layout.height;
    const startZoom = zoom;
    const startPan = { ...pan };
    let endZoom: number;
    let endPan: { x: number; y: number };
    if (target) {
      const margin = 80;
      const desiredScreen = Math.min(
        (containerRef.current?.clientWidth ?? layout.width) - margin,
        (containerRef.current?.clientHeight ?? layout.height) - margin,
      );
      const targetDiameter = Math.max(target.radius * 2, 40);
      const baseScale = Math.min(
        (containerRef.current?.clientWidth ?? layout.width) / fitWidth,
        (containerRef.current?.clientHeight ?? layout.height) / fitHeight,
      );
      endZoom = clamp(desiredScreen / (targetDiameter * baseScale), ZOOM_MIN, ZOOM_MAX);
      endPan = {
        x: (fitWidth / 2 - target.x) * (baseScale * endZoom),
        y: (fitHeight / 2 - target.y) * (baseScale * endZoom),
      };
    } else {
      endZoom = 1;
      endPan = { x: 0, y: 0 };
    }
    const start = performance.now();
    const duration = 350;
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOut(t);
      onZoomChange(startZoom + (endZoom - startZoom) * eased);
      onPanChange({
        x: startPan.x + (endPan.x - startPan.x) * eased,
        y: startPan.y + (endPan.y - startPan.y) * eased,
      });
      if (t < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        animationRef.current = null;
      }
    };
    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-run only on focusRequest.id
  }, [focusRequest.id, layout]);

  // Convert client-space pointer to logical layout coords for hit-tests.
  const clientToLayout = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const baseScale = Math.min(cssWidth / layout.width, cssHeight / layout.height);
      const scale = baseScale * zoom;
      const offsetX = (cssWidth - layout.width * scale) / 2 + pan.x;
      const offsetY = (cssHeight - layout.height * scale) / 2 + pan.y;
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      return { x: (px - offsetX) / scale, y: (py - offsetY) / scale };
    },
    [layout.height, layout.width, pan.x, pan.y, zoom],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        panX: pan.x,
        panY: pan.y,
        moved: false,
      };
    },
    [pan.x, pan.y],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        drag.moved = true;
      }
      onPanChange({ x: drag.panX + dx, y: drag.panY + dy });
    },
    [onPanChange],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || drag.moved) return;
      // Click — hit-test against node positions.
      const point = clientToLayout(event.clientX, event.clientY);
      if (!point) return;
      let closest: { id: string; distSq: number } | null = null;
      for (const node of nodeViews) {
        const dx = node.x - point.x;
        const dy = node.y - point.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= STAR_RADIUS * STAR_RADIUS * 4) {
          if (!closest || distSq < closest.distSq) {
            closest = { id: node.id, distSq };
          }
        }
      }
      if (closest) {
        router.push(`/portfolio/${closest.id}`);
      }
    },
    [clientToLayout, nodeViews, router],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      onZoomChange(clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX));
    },
    [onZoomChange, zoom],
  );

  return (
    <div ref={containerRef} className="relative h-[480px] w-full md:h-[600px]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Galaxy canvas with ${nodeViews.length} stars across ${clusters.filter((c) => c.projects.length > 0).length} constellations`}
        width={width}
        height={height}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onWheel={onWheel}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
