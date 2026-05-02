"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UpvoteButtonProps {
  promptId: string;
  initialCount: number;
}

/**
 * Idempotent upvote toggle. POSTs to `/api/prompts/[id]/upvote` and shows
 * an optimistic count, reverting on a non-2xx response. The server is the
 * source of truth — the response carries the authoritative `upvoteCount`.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Idempotent upvotes).
 */
export function UpvoteButton({ promptId, initialCount }: UpvoteButtonProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (submitting) return;
    const optimisticCount = count + 1;
    setCount(optimisticCount);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/prompts/${encodeURIComponent(promptId)}/upvote`, {
        method: "POST",
      });
      if (!response.ok) {
        setCount(initialCount);
        return;
      }
      const data = (await response.json()) as { count?: number };
      if (typeof data.count === "number") {
        setCount(data.count);
      }
      router.refresh();
    } catch {
      setCount(initialCount);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      aria-label={`Upvote (${count})`}
      className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden="true">🔥</span>
      <span>{count}</span>
    </button>
  );
}
