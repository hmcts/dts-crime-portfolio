"use client";

import { useState, type FormEvent } from "react";

import { isAllowedPreviewAuthDomain } from "@/lib/preview-auth/email-domain";

interface SignInFormProps {
  action: (formData: FormData) => void | Promise<void>;
  next: string;
  initialError: string | null;
  allowedDomains: readonly string[];
}

/**
 * Client wrapper around the sign-in form. Provides an inline error region
 * so the user gets immediate feedback when they enter a non-HMCTS /
 * non-justice.gov.uk email — but the server action remains the
 * source-of-truth and re-validates the same way (see `app/preview-auth/page.tsx`).
 *
 * Spec: openspec/changes/add-preview-auth/specs/preview-auth/spec.md
 * (Domain restriction on the sign-in surface).
 */
export function SignInForm({ action, next, initialError, allowedDomains }: SignInFormProps) {
  const [clientError, setClientError] = useState<string | null>(null);
  const allowedDomainsCopy = allowedDomains.map((d) => `@${d}`).join(" or ");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = new FormData(form);
    const rawEmail = String(data.get("email") ?? "").trim();
    if (rawEmail.length === 0) {
      // Browser-level required handles this; defer to native message.
      setClientError(null);
      return;
    }
    if (!isAllowedPreviewAuthDomain(rawEmail)) {
      event.preventDefault();
      setClientError(
        `Sign-in is limited to ${allowedDomainsCopy} emails. The address you entered uses a different domain.`,
      );
      return;
    }
    setClientError(null);
  }

  const errorToShow = clientError ?? initialError;

  return (
    <form action={action} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3" noValidate>
      <input type="hidden" name="next" value={next} />
      <label className="text-sm font-medium text-neutral-700" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-describedby="email-hint email-error"
        aria-invalid={errorToShow ? true : undefined}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        onChange={() => {
          if (clientError) setClientError(null);
        }}
      />
      <p id="email-hint" className="text-xs text-neutral-600">
        Use your {allowedDomainsCopy} email.
      </p>
      <p
        id="email-error"
        role={errorToShow ? "alert" : undefined}
        aria-live="polite"
        className={`text-sm text-red-700 ${errorToShow ? "" : "sr-only"}`}
      >
        {errorToShow ?? ""}
      </p>
      <button
        type="submit"
        className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Continue
      </button>
    </form>
  );
}
