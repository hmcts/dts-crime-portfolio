import "server-only";

import { redirect } from "next/navigation";

import { EditorAllowlistPage } from "@/components/admin/EditorAllowlistPage";
import { listEditorAllowlist } from "@/lib/admin/editors";
import { resolveUser } from "@/lib/auth/resolver";
import { listProjects } from "@/lib/portfolio/listProjects";
import { emptyPortfolioFilters } from "@/lib/portfolio/filters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editor allowlist — Admin",
};

/**
 * Admin-only surface for granting / revoking per-project edit access.
 * Spec: openspec/specs/access-control/spec.md (Three-role model, Editor
 * on a specific project) and
 * decisions/2026-05-03-editor-allowlist-claude-design-brief.md.
 *
 * Server component: resolves the caller, hard-fails for non-admins
 * (403 page rather than the form rendering empty), then fetches the
 * initial allowlist + the project list (still in Sanity) and hands
 * them to the client component.
 */
export default async function AdminEditorsPage() {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    // Middleware already handles unauthorized for /preview-auth flow;
    // this is a defensive redirect for the (rare) case the header is
    // missing on a direct hit.
    redirect("/preview-auth");
  }
  if (!user.isAdmin) {
    return <ForbiddenPanel />;
  }

  const [{ filtered: projects }, entries] = await Promise.all([
    listProjects(emptyPortfolioFilters()),
    listEditorAllowlist(),
  ]);

  const projectOptions = projects.map((p) => ({ id: p._id, name: p.name }));

  return (
    <EditorAllowlistPage
      initialEntries={entries}
      projects={projectOptions}
      currentAdminEmail={user.email}
    />
  );
}

function ForbiddenPanel() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold tracking-tight text-amber-900">
          Admin access required
        </h1>
        <p className="mt-2 text-sm text-amber-900/80">
          The editor allowlist is restricted to administrators. If you need
          to manage per-project edit access, ask an existing admin to add
          you to the <code className="rounded bg-white/60 px-1">ADMIN_ALLOWLIST</code>.
        </p>
      </div>
    </main>
  );
}
