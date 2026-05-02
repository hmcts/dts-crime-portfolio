import Link from "next/link";

import { SubmitPromptForm } from "@/components/prompts/SubmitPromptForm";
import { resolveUser } from "@/lib/auth/resolver";

export const dynamic = "force-dynamic";

/**
 * Server shell for the "Share your own prompt" form. The form itself is a
 * client component co-located in `components/prompts/SubmitPromptForm.tsx`
 * so it can manage its own controlled state and POST to `/api/prompts`.
 *
 * Anyone authenticated can submit; an unauthenticated viewer is shown a
 * minimal sign-in prompt instead of the form.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Prompt creation),
 * openspec/specs/access-control/spec.md.
 */
export default async function NewPromptPage() {
  const user = await resolveUser();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
        <Link
          href="/prompts"
          className="text-xs font-medium text-blue-700 underline underline-offset-2"
        >
          ← Back to prompts
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Share your own prompt</h1>
        <p className="text-sm text-neutral-600">
          Help the community by sharing a prompt that worked well for you. Pick the tool you used,
          add a few tags, and paste the prompt body.
        </p>
      </header>

      {user.kind === "unauthorized" ? (
        <section className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <h2 className="text-base font-semibold text-neutral-800">Sign in to share a prompt</h2>
          <p className="mt-2 text-sm text-neutral-600">
            We could not identify you from your session. Please sign in to share a prompt with the
            community.
          </p>
        </section>
      ) : (
        <section className="mt-6">
          <SubmitPromptForm />
        </section>
      )}
    </main>
  );
}
