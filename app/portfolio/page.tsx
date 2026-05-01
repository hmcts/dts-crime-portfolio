import { PortfolioEmptyState } from "@/components/portfolio/PortfolioEmptyState";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { listProjects } from "@/lib/portfolio/listProjects";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const projects = await listProjects();
  const total = projects.length;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {total === 0
              ? "No projects yet."
              : `Showing ${total} of ${total} projects`}
          </p>
        </div>
      </header>
      {total === 0 ? (
        <div className="mt-6">
          <PortfolioEmptyState />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project._id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
