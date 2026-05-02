"use client";

import { StagePill } from "@/components/portfolio/StagePill";
import { DossierHeaderEditor } from "@/components/portfolio/dossier/edit/DossierHeaderEditor";
import { EditableSection } from "@/components/portfolio/dossier/edit/EditableSection";
import type { ProjectDossier } from "@/lib/portfolio/dossier";

interface DossierHeaderProps {
  dossier: ProjectDossier;
  canEdit?: boolean;
}

export function DossierHeader({ dossier, canEdit = false }: DossierHeaderProps) {
  const display = (
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

  return (
    <EditableSection
      canEdit={canEdit}
      pencilLabel="Edit description"
      display={display}
      renderEditor={(close) => (
        <DossierHeaderEditor
          projectId={dossier._id}
          initialDescription={dossier.description}
          onClose={close}
        />
      )}
    />
  );
}
