import Link from "next/link";
import { notFound } from "next/navigation";

import { DossierActionLinks } from "@/components/portfolio/dossier/DossierActionLinks";
import { DossierAreaRow } from "@/components/portfolio/dossier/DossierAreaRow";
import { DossierGovernanceRow } from "@/components/portfolio/dossier/DossierGovernanceRow";
import { DossierHeader } from "@/components/portfolio/dossier/DossierHeader";
import { DossierPeopleRow } from "@/components/portfolio/dossier/DossierPeopleRow";
import { DossierUpdates } from "@/components/portfolio/dossier/DossierUpdates";
import { fetchProjectDossier } from "@/lib/portfolio/dossier";
import { formatLastUpdatedFooter } from "@/lib/portfolio/format";

export const dynamic = "force-dynamic";

interface DossierPageProps {
  params: Promise<{ id: string }>;
}

export default async function DossierPage({ params }: DossierPageProps) {
  const { id } = await params;
  const dossier = await fetchProjectDossier(id);
  if (!dossier) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <nav className="flex items-center justify-between text-sm">
        <Link
          href="/portfolio"
          className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          ← Back to portfolio
        </Link>
        <span className="text-xs text-neutral-500">
          {formatLastUpdatedFooter(dossier.lastUpdatedAt)}
        </span>
      </nav>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
        Project dossier
      </p>
      <div className="mt-2 space-y-8">
        <DossierHeader dossier={dossier} />
        <DossierAreaRow dossier={dossier} />
        <DossierPeopleRow dossier={dossier} />
        <DossierGovernanceRow dossier={dossier} />
        <DossierActionLinks dossier={dossier} />
        <DossierUpdates dossier={dossier} />
        {dossier.githubUrl && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Source
            </h2>
            <a
              href={dossier.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-blue-700 underline underline-offset-2"
            >
              {dossier.githubUrl}
            </a>
          </section>
        )}
      </div>
    </main>
  );
}
