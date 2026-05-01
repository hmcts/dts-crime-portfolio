import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-12">
      <h1 className="text-3xl font-semibold tracking-tight">DTS Crime Portfolio</h1>
      <p className="mt-3 text-neutral-600">
        Single discoverable front door for DTS Crime delivery information.
      </p>
      <ul className="mt-6 space-y-1 text-sm">
        <li>
          <Link className="text-blue-700 underline underline-offset-2" href="/portfolio">
            Portfolio
          </Link>
        </li>
        <li>
          <Link className="text-blue-700 underline underline-offset-2" href="/studio">
            Sanity Studio
          </Link>
        </li>
      </ul>
    </main>
  );
}
