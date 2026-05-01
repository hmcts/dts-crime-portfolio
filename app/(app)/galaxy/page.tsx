import { GalaxyView } from "@/components/galaxy/GalaxyView";
import { listGalaxyProjects } from "@/lib/galaxy/list";

export const dynamic = "force-dynamic";

/**
 * `/galaxy` — zoomable, pannable canvas constellation map. Server fetch
 * returns every project with the metadata each lens, overlay, and shared
 * filter needs; the client component owns the canvas, camera, legend,
 * and URL state. Spec: openspec/specs/galaxy-view/spec.md.
 */
export default async function GalaxyPage() {
  const projects = await listGalaxyProjects();

  return (
    <main className="mx-auto max-w-7xl p-6">
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-700">
          No projects yet.
        </div>
      ) : (
        <GalaxyView projects={projects} />
      )}
    </main>
  );
}
