import Link from "next/link";

import type { DossierActionLink, ProjectDossier } from "@/lib/portfolio/dossier";

const MAX_LABEL_LENGTH = 36;

function truncate(value: string): string {
  if (value.length <= MAX_LABEL_LENGTH) return value;
  return `${value.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`;
}

function ActionChip({ link }: { link: DossierActionLink }) {
  return (
    <Link
      href={`/action-plan?action=${link.actionNo}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900 hover:border-blue-300 hover:bg-blue-100"
    >
      <span className="font-semibold">{link.actionNo}</span>
      <span>{truncate(link.name)}</span>
    </Link>
  );
}

interface DossierActionLinksProps {
  dossier: ProjectDossier;
  /**
   * Reserved for the action picker editor. Action reference editing is
   * deferred behind the same canEdit gate — the prop is accepted now so
   * downstream wiring is consistent across every dossier section.
   */
  canEdit?: boolean;
}

export function DossierActionLinks({ dossier }: DossierActionLinksProps) {
  const links = dossier.actionPlanLinks ?? [];
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Action plan links
      </h2>
      {links.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Not linked to any actions.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {links.map((link) => (
            <ActionChip key={link._id} link={link} />
          ))}
        </div>
      )}
    </section>
  );
}
