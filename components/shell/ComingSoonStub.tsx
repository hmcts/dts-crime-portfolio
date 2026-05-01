import Link from "next/link";

interface ComingSoonStubProps {
  title: string;
  spec: string;
  blurb: string;
}

export function ComingSoonStub({ title, spec, blurb }: ComingSoonStubProps) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="border-b border-neutral-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-neutral-500">Coming soon</p>
      </header>
      <p className="mt-6 text-sm leading-relaxed text-neutral-700">{blurb}</p>
      <p className="mt-3 text-xs text-neutral-500">
        Behaviour is specified in <code>{spec}</code>.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/portfolio"
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
        >
          ← Back to portfolio
        </Link>
      </div>
    </main>
  );
}
