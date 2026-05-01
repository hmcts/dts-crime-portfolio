import { AssuranceChip } from "@/components/portfolio/dossier/AssuranceChip";
import type { ProjectDossier } from "@/lib/portfolio/dossier";
import { assuranceVerdict } from "@/lib/portfolio/dossierFormat";

export function DossierGovernanceRow({ dossier }: { dossier: ProjectDossier }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Governance and assurance
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <AssuranceChip
          label="Risk register"
          verdict={assuranceVerdict(dossier.riskRegister)}
        />
        <AssuranceChip
          label="Governance"
          verdict={
            dossier.governanceBody || dossier.governanceTier !== null
              ? { tone: "ok", label: dossier.governanceBody ?? "Recorded" }
              : { tone: "missing", label: "Not yet recorded" }
          }
          detail={dossier.governanceTier !== null ? `Tier ${dossier.governanceTier}` : undefined}
        />
        <AssuranceChip label="DPIA" verdict={assuranceVerdict(dossier.dpiaInPlace)} />
        <AssuranceChip label="ATRS" verdict={assuranceVerdict(dossier.actsInPlace)} />
        <AssuranceChip
          label="Ethics framework"
          verdict={assuranceVerdict(dossier.mojEthicsFrameworkUse)}
        />
      </div>
    </section>
  );
}
