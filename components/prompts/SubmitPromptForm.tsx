"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  PROMPT_TAGS,
  PROMPT_TOOLS,
  PROMPT_TOOL_LABELS,
  type PromptTag,
  type PromptTool,
} from "@/lib/prompts/types";

interface FieldErrors {
  title?: string;
  body?: string;
}

/**
 * Client form for the "Share your own prompt" page. Submits to
 * `POST /api/prompts` and redirects to `/prompts` on success. Inline
 * errors surface for missing `title` or `body`. Tag selection is a chip
 * multi-select; tool selection is a radio group keyed by the same
 * options as the Sanity schema.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Prompt creation).
 */
export function SubmitPromptForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [tool, setTool] = useState<PromptTool>("copilot");
  const [tags, setTags] = useState<PromptTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: PromptTag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const errors: FieldErrors = {};
    if (!trimmedTitle) errors.title = "Title is required";
    if (!trimmedBody) errors.body = "Prompt body is required";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          summary: summary.trim() || null,
          body: trimmedBody,
          tool,
          tags,
        }),
      });
      if (response.ok) {
        router.push("/prompts");
        router.refresh();
        return;
      }
      if (response.status === 401) {
        setError("Your session has expired. Please refresh and sign in again.");
      } else if (response.status === 400) {
        setError("Submission rejected. Please check the required fields.");
      } else {
        setError("Save failed. Please try again.");
      }
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg border border-neutral-200 bg-white p-5"
      aria-label="Share your own prompt"
      noValidate
    >
      <div className="space-y-2">
        <label htmlFor="prompt-title" className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Title
        </label>
        <input
          id="prompt-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={submitting}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? "prompt-title-error" : undefined}
          className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {fieldErrors.title && (
          <p id="prompt-title-error" role="alert" className="text-xs text-rose-700">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="prompt-summary" className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Summary <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <textarea
          id="prompt-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          disabled={submitting}
          rows={2}
          className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="prompt-body" className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Prompt body
        </label>
        <textarea
          id="prompt-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={submitting}
          rows={8}
          aria-invalid={fieldErrors.body ? true : undefined}
          aria-describedby={fieldErrors.body ? "prompt-body-error" : undefined}
          className="w-full rounded-md border border-neutral-300 bg-white p-2 font-mono text-xs leading-relaxed text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {fieldErrors.body && (
          <p id="prompt-body-error" role="alert" className="text-xs text-rose-700">
            {fieldErrors.body}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Tool
        </legend>
        <div className="flex flex-wrap gap-3">
          {PROMPT_TOOLS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-neutral-800">
              <input
                type="radio"
                name="tool"
                value={option}
                checked={tool === option}
                onChange={() => setTool(option)}
                disabled={submitting}
              />
              <span>{PROMPT_TOOL_LABELS[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Tags
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_TAGS.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                disabled={submitting}
                aria-pressed={selected}
                className={
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition " +
                  (selected
                    ? "border-blue-500 bg-blue-100 text-blue-800"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400")
                }
              >
                {tag}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Share prompt"}
        </button>
      </div>
    </form>
  );
}
