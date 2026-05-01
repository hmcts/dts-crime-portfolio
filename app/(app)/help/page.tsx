import { HelpFaq } from "@/components/help/HelpFaq";
import { fetchFaqEntries } from "@/lib/help/list";

export const dynamic = "force-dynamic";

// TODO: source this from a Sanity-managed settings document so support can
// update the address without a deploy. Spec: openspec/specs/help-faq/spec.md
// (Footer contact).
const SUPPORT_EMAIL = "support@hmcts.net";

export default async function HelpPage() {
  const entries = await fetchFaqEntries();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="border-b border-neutral-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Frequently asked questions about the DTS Crime portfolio, AI tooling, and
          acceptable use.
        </p>
      </header>

      <HelpFaq entries={entries} />

      <footer className="mt-12 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
          Still need help?
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Email the team and we&apos;ll get back to you.
        </p>
        <p className="mt-3 text-sm">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </footer>
    </main>
  );
}
