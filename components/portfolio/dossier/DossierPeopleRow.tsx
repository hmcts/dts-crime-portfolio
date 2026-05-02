import type { DossierPerson, ProjectDossier } from "@/lib/portfolio/dossier";

interface PersonSlotProps {
  role: string;
  person: DossierPerson | null | undefined;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function PersonSlot({ role, person }: PersonSlotProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{role}</h3>
      {!person ? (
        <p className="mt-2 inline-flex items-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-500">
          Not yet assigned
        </p>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white"
          >
            {initials(person.name)}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-900">{person.name}</span>
            <a
              href={`mailto:${person.email}`}
              className="text-xs text-blue-700 underline underline-offset-2"
            >
              {person.email}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

interface DossierPeopleRowProps {
  dossier: ProjectDossier;
  /**
   * Reserved for the people picker editor. Person reference editing is
   * deferred behind the same canEdit gate — the prop is accepted now so
   * downstream wiring is consistent across every dossier section.
   */
  canEdit?: boolean;
}

export function DossierPeopleRow({ dossier }: DossierPeopleRowProps) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">People</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <PersonSlot role="Delivery owner" person={dossier.deliveryOwner} />
        <PersonSlot role="Business lead" person={dossier.businessLead} />
        <PersonSlot role="Legal lead" person={dossier.legalLead} />
      </div>
    </section>
  );
}
