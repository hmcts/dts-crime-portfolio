import Link from "next/link";

import { StagePill } from "@/components/portfolio/StagePill";
import {
  PROFILE_ROLE_LABELS,
  type ProfileProject,
  type ProfileRole,
} from "@/lib/profile/list";

interface RoleSectionProps {
  role: ProfileRole;
  projects: ProfileProject[];
}

export function RoleSection({ role, projects }: RoleSectionProps) {
  if (projects.length === 0) return null;
  return (
    <section id={role} className="scroll-mt-6">
      <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
        {PROFILE_ROLE_LABELS[role]}
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <li key={project._id}>
            <Link
              href={`/portfolio/${project._id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 hover:border-neutral-300 hover:shadow-sm"
            >
              <span className="truncate text-sm font-medium text-neutral-800">{project.name}</span>
              <StagePill stage={project.projectStage} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
