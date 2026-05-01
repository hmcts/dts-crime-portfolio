import { PortableTextRenderer } from "@/lib/portable-text/renderer";
import type { ProjectDossier } from "@/lib/portfolio/dossier";
import { formatUpdateTimestamp } from "@/lib/portfolio/dossierFormat";

export function DossierUpdates({ dossier }: { dossier: ProjectDossier }) {
  const updates = (dossier.updates ?? [])
    .slice()
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Updates</h2>
      {updates.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">No updates yet.</p>
      ) : (
        <ol className="mt-3 space-y-4 border-l border-neutral-200 pl-4">
          {updates.map((update, index) => (
            <li key={update._key ?? `update-${index}`} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[21px] mt-1 inline-block h-2 w-2 rounded-full bg-neutral-400"
              />
              <header className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span>{formatUpdateTimestamp(update.timestamp)}</span>
                {update.authorEmail && (
                  <span aria-hidden="true" className="text-neutral-300">
                    ·
                  </span>
                )}
                {update.authorEmail && <span>{update.authorEmail}</span>}
              </header>
              {update.title && (
                <h3 className="mt-1 text-sm font-semibold text-neutral-900">{update.title}</h3>
              )}
              {update.body && update.body.length > 0 && (
                <div className="mt-1 text-sm text-neutral-700">
                  <PortableTextRenderer value={update.body} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
