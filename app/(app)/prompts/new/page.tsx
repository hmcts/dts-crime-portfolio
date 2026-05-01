import Link from "next/link";

import { SubmitPromptForm } from "@/components/prompts/SubmitPromptForm";

export const dynamic = "force-dynamic";

/**
 * Server shell for the "Share your own prompt" form. The form itself is a
 * client component co-located in `components/prompts/SubmitPromptForm.tsx`
 * so it can manage its own controlled state and POST to `/api/prompts`.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Prompt creation).
 */
export default function NewPromptPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
        <Link href="/prompts" className="text-xs font-medium text-blue-700 underline underline-offset-2">
          ← Back to prompts
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Share your own prompt</h1>
        <p className="text-sm text-neutral-600">
          Help the community by sharing a prompt that worked well for you. Pick the tool you used,
          add a few tags, and paste the prompt body.
        </p>
      </header>

      <section className="mt-6">
        <SubmitPromptForm />
      </section>
    </main>
  );
}
