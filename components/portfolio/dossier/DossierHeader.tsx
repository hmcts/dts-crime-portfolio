import { StagePill } from "@/components/portfolio/StagePill";
import type { ProjectDossier } from "@/lib/portfolio/dossier";

export function DossierHeader({ dossier }: { dossier: ProjectDossier }) {
  return (
    <header className="flex flex-col gap-3 border-b border-neutral-200 pb-5">
      <div className="flex flex-wrap items-center gap-2">
        <StagePill stage={dossier.projectStage} />
        {dossier.capability && (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
            {dossier.capability.name}
          </span>
        )}
        {dossier.governanceTier !== null && (
          <span className="inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
            Tier {dossier.governanceTier}
          </span>
        )}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{dossier.name}</h1>
      {dossier.description && (
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-700">{dossier.description}</p>
      )}
    </header>
  );
}
