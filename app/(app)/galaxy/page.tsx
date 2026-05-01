import { GalaxySvg } from "@/components/galaxy/GalaxySvg";
import { LensSelector } from "@/components/galaxy/LensSelector";
import { buildLayout } from "@/lib/galaxy/layout";
import { listGalaxyProjects } from "@/lib/galaxy/list";
import { isGalaxyLens, type GalaxyLens } from "@/lib/galaxy/types";

export const dynamic = "force-dynamic";

interface GalaxyPageProps {
  searchParams: Promise<{ lens?: string | string[] }>;
}

function resolveLens(raw: string | string[] | undefined): GalaxyLens {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isGalaxyLens(value) ? value : "stage";
}

/**
 * v0 galaxy view. Renders every project as a labelled circle inside a
 * static SVG, grouped by the chosen lens (stage or capability). The
 * full canvas/WebGL implementation — force-directed layout, signal
 * overlays, deep-link `/galaxy/[id]`, and camera controls — is tracked
 * in openspec/specs/galaxy-view/spec.md.
 */
export default async function GalaxyPage({ searchParams }: GalaxyPageProps) {
  const resolved = await searchParams;
  const lens = resolveLens(resolved.lens);
  const projects = await listGalaxyProjects();
  const layout = buildLayout(projects, lens);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Galaxy view</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        <LensSelector activeLens={lens} />
      </header>
      <p
        role="note"
        className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
      >
        v0 placeholder — full zoomable canvas with force-directed layout,
        signal overlays, and camera controls is planned. Tracked in
        openspec/specs/galaxy-view/spec.md
      </p>
      <section className="mt-4" aria-label="Galaxy">
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-700">
            No projects yet.
          </div>
        ) : (
          <GalaxySvg layout={layout} />
        )}
      </section>
    </main>
  );
}
