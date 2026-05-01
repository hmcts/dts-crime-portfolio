"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface CommentFormProps {
  promptId: string;
  initialCount: number;
}

/**
 * Append-a-comment form for a prompt card. POSTs to
 * `/api/prompts/[id]/comments` with the body string. Empty submissions
 * are rejected client-side and on the server. On success the optimistic
 * comment count is replaced by the authoritative count from the response.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Comments).
 */
export function CommentForm({ promptId, initialCount }: CommentFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [count, setCount] = useState(initialCount);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Comment cannot be empty.");
      return;
    }

    const previousCount = count;
    const optimisticCount = previousCount + 1;
    setCount(optimisticCount);
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/prompts/${encodeURIComponent(promptId)}/comments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        },
      );
      if (!response.ok) {
        setCount(previousCount);
        if (response.status === 400) {
          setError("Comment cannot be empty.");
        } else if (response.status === 401) {
          setError("Your session has expired. Please refresh and sign in again.");
        } else {
          setError("Failed to post comment. Please try again.");
        }
        return;
      }
      const data = (await response.json()) as { count?: number };
      if (typeof data.count === "number") {
        setCount(data.count);
      }
      setBody("");
      router.refresh();
    } catch {
      setCount(previousCount);
      setError("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <details className="w-full">
      <summary
        aria-label={`${count} comments — add a comment`}
        className="cursor-pointer list-none text-xs text-neutral-600 hover:text-neutral-800"
      >
        <span>💬 {count}</span>
        <span className="ml-2 text-blue-700 underline underline-offset-2">Comment</span>
      </summary>
      <form
        onSubmit={handleSubmit}
        className="mt-2 flex w-full flex-col gap-1.5"
        aria-label="Add a comment"
      >
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={submitting}
          rows={2}
          placeholder="Add a comment…"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Posting…" : "Submit"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-rose-700">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
