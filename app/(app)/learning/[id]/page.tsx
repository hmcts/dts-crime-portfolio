import Link from "next/link";
import { notFound } from "next/navigation";

import { TypePill } from "@/components/learning/TypePill";
import { fetchLearningItem } from "@/lib/learning/list";
import { PortableTextRenderer } from "@/lib/portable-text/renderer";

export const dynamic = "force-dynamic";

interface LearningItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function LearningItemPage({ params }: LearningItemPageProps) {
  const { id } = await params;
  const item = await fetchLearningItem(id);
  if (!item) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <nav className="text-sm">
        <Link
          href="/learning"
          className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          ← Back to learning
        </Link>
      </nav>
      <header className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          <TypePill type={item.type} featured={item.featured} />
        </div>
        {item.tags && item.tags.length > 0 && (
          <p className="mt-2 text-xs text-neutral-500">{item.tags.join(" · ")}</p>
        )}
      </header>
      {item.mediaUrl && (
        <section className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Media
          </h2>
          <a
            href={item.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-blue-700 underline underline-offset-2"
          >
            Open external link
          </a>
        </section>
      )}
      {item.body && item.body.length > 0 && (
        <article className="mt-6">
          <PortableTextRenderer value={item.body} />
        </article>
      )}
    </main>
  );
}
