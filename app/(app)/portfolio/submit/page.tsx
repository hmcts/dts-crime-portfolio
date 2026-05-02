import "server-only";

import Link from "next/link";

import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { resolveUser } from "@/lib/auth/resolver";
import { fetchReferenceData } from "@/lib/portfolio/referenceData";

export const dynamic = "force-dynamic";

/**
 * Project submission survey shell. Resolves the calling user (rendering an
 * Unauthorised view when no identity is present), fetches reference-data
 * server-side once, and hands it to the client form.
 *
 * Spec: openspec/specs/project-submission/spec.md (Reference-data driven
 * dropdowns — single round-trip on mount).
 */
export default async function PortfolioSubmitPage() {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return <UnauthorizedView />;
  }

  const referenceData = await fetchReferenceData();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <nav className="text-sm">
        <Link
          href="/portfolio"
          className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          ← Back to portfolio
        </Link>
      </nav>
      <header className="mt-4 border-b border-neutral-200 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          New submission
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Submit a project
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Six sections covering tiering, basics, ownership, capability,
          governance, and a first update.
        </p>
      </header>
      <SubmissionForm referenceData={referenceData} />
    </main>
  );
}

function UnauthorizedView() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Unauthorised</h1>
      <p className="mt-3 text-sm text-neutral-700">
        We could not identify you. The submission form is only available to
        users admitted by the upstream auth proxy.
      </p>
    </main>
  );
}
