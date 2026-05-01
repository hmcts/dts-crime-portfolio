import Link from "next/link";

export const dynamic = "force-dynamic";

interface DossierPageProps {
  params: Promise<{ id: string }>;
}

export default async function DossierPlaceholderPage({ params }: DossierPageProps) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl p-12">
      <Link href="/portfolio" className="text-sm text-blue-700 underline">
        ← Back to portfolio
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Project dossier</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Dossier UI is not built yet. Project ID: <code className="text-xs">{id}</code>
      </p>
    </main>
  );
}
