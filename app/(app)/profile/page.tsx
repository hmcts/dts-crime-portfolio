import Link from "next/link";

import { RoleSection } from "@/components/profile/RoleSection";
import { RoleTile } from "@/components/profile/RoleTile";
import { resolveUser } from "@/lib/auth/resolver";
import {
  PROFILE_ROLES,
  fetchProfileProjects,
  groupProfileProjectsByRole,
} from "@/lib/profile/list";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return <UnauthorisedView />;
  }

  const projects = await fetchProfileProjects(user.email);
  const grouped = groupProfileProjectsByRole(projects);
  const totals = PROFILE_ROLES.map((role) => ({ role, count: grouped[role].length }));
  const anyProjects = totals.some((entry) => entry.count > 0);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="border-b border-neutral-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-neutral-600">Signed in as {user.email}.</p>
      </header>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {totals.map(({ role, count }) => (
          <RoleTile key={role} role={role} count={count} />
        ))}
      </section>
      {anyProjects ? (
        <div className="mt-8 space-y-8">
          {PROFILE_ROLES.map((role) => (
            <RoleSection key={role} role={role} projects={grouped[role]} />
          ))}
        </div>
      ) : (
        <EmptyProfile />
      )}
    </main>
  );
}

function EmptyProfile() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <p className="text-sm text-neutral-700">
        You aren&apos;t connected to any projects yet under your signed-in email.
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Ask the project&apos;s editor to add you, or submit a new project below.
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Link
          href="/portfolio"
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:border-neutral-400"
        >
          Browse the portfolio
        </Link>
        <Link
          href="/portfolio/submit"
          className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
        >
          Submit a new project
        </Link>
      </div>
    </div>
  );
}

function UnauthorisedView() {
  return (
    <main className="mx-auto max-w-3xl p-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-3 text-sm text-neutral-600">
        We can&apos;t identify you yet. Sign in via the auth proxy (or the preview-auth page in
        non-production) to see your projects.
      </p>
    </main>
  );
}
