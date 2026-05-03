"use client";

import { useState } from "react";

import type { EditorAllowlistEntry } from "@/lib/admin/editors";

import type { ProjectOption } from "./EditorAllowlistPage";

interface Props {
  projects: ProjectOption[];
  existingPairs: Array<{ email: string; projectId: string }>;
  onGranted: (entry: EditorAllowlistEntry) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * "Grant edit access" form — top of the page per the brief. Inline
 * validation: email shape, project required, no duplicate (email,
 * project) pair. On success the parent prepends the row to the table
 * and shows a 2-second highlight; this component just clears its
 * inputs.
 */
export function GrantEditAccessForm({ projects, existingPairs, onGranted }: Props) {
  const [email, setEmail] = useState("");
  const [projectId, setProjectId] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    let ok = true;
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("Enter a valid email address");
      ok = false;
    } else {
      setEmailError(null);
    }
    if (!projectId) {
      setProjectError("Choose a project");
      ok = false;
    } else {
      setProjectError(null);
    }
    if (ok) {
      const dup = existingPairs.some(
        (pair) => pair.email === trimmedEmail && pair.projectId === projectId,
      );
      if (dup) {
        setSubmitError("This editor already has access to this project");
        return false;
      }
    }
    return ok;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/editors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), projectId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        entry?: EditorAllowlistEntry;
        error?: string;
      };
      if (!response.ok) {
        setSubmitError(payload.error ?? `Request failed (${response.status})`);
        return;
      }
      if (payload.entry) onGranted(payload.entry);
      setEmail("");
      setProjectId("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="grant-form-heading"
      className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <h2
        id="grant-form-heading"
        className="text-sm font-semibold uppercase tracking-wide text-neutral-700"
      >
        Grant edit access
      </h2>
      <form
        onSubmit={onSubmit}
        className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]"
        noValidate
      >
        <div>
          <label
            htmlFor="grant-email"
            className="block text-xs font-medium text-neutral-700"
          >
            Email
          </label>
          <input
            id="grant-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailError ? "true" : undefined}
            aria-describedby={emailError ? "grant-email-error" : undefined}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
          {emailError && (
            <p id="grant-email-error" className="mt-1 text-xs text-red-700">
              {emailError}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="grant-project"
            className="block text-xs font-medium text-neutral-700"
          >
            Project
          </label>
          <select
            id="grant-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-invalid={projectError ? "true" : undefined}
            aria-describedby={projectError ? "grant-project-error" : undefined}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">Choose a project…</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projectError && (
            <p id="grant-project-error" className="mt-1 text-xs text-red-700">
              {projectError}
            </p>
          )}
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-neutral-700 disabled:opacity-60"
          >
            {submitting ? "Granting…" : "Grant edit access"}
          </button>
        </div>
      </form>
      <div aria-live="polite" className="min-h-[1.25rem] pt-2">
        {submitError && (
          <p className="text-xs text-red-700">{submitError}</p>
        )}
      </div>
    </section>
  );
}
