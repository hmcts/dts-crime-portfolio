import type { ProjectDossier } from "@/lib/portfolio/dossier";

export function DossierAreaRow({ dossier }: { dossier: ProjectDossier }) {
  const deliveryAreaParts = [dossier.group?.name, dossier.directorate?.name].filter(Boolean);
  const businessAreas = dossier.businessAreas ?? [];

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Delivery area
        </h2>
        {deliveryAreaParts.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Not yet recorded.</p>
        ) : (
          <p className="mt-2 text-sm text-neutral-800">{deliveryAreaParts.join(" · ")}</p>
        )}
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Business areas
        </h2>
        {businessAreas.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Not yet recorded.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {businessAreas.map((area) => (
              <span
                key={area._id}
                className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
              >
                {area.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
