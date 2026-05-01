"use client";

import Link from "next/link";

/**
 * Exemption banner rendered above section 1 of the submission survey.
 *
 * Spec: openspec/specs/project-submission/spec.md (Requirement: Exemption
 * banner). Lists the categories of use that do NOT need to fill in the
 * survey, plus a "Skip — my use is exempt" link that closes the form.
 */
export function ExemptionBanner() {
  return (
    <aside
      role="note"
      aria-label="Exemption notice"
      className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <h2 className="text-sm font-semibold">You may not need to fill this in</h2>
      <p className="mt-1 text-xs">
        The submission survey is for AI projects that influence frontline
        justice work. You can skip it if your use falls into any of the
        following categories:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        <li>Casual Copilot or ChatGPT use that does not handle PII.</li>
        <li>Non-frontline use (back-office productivity, learning, drafting).</li>
        <li>
          Use that does not influence automated justice decisions or affect
          members of the public.
        </li>
      </ul>
      <p className="mt-3">
        <Link
          href="/portfolio"
          className="text-xs font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950"
        >
          Skip — my use is exempt
        </Link>
      </p>
    </aside>
  );
}
