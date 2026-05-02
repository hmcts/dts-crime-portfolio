"use client";

import { useState } from "react";

interface CommentUpvoteButtonProps {
  promptId: string;
  commentKey: string;
  initialCount: number;
}

/**
 * Idempotent per-comment upvote toggle. POSTs to
 * `/api/prompts/[id]/comments/[commentKey]/upvote` and shows an
 * optimistic count, reverting on a non-2xx response. The server is
 * the source of truth — the response carries the authoritative
 * `count`.
 *
 * Visually mirrors the prompt-level `UpvoteButton` (small thumb-up
 * indicator + count) but is intentionally a separate component so
 * the prompt-level button can evolve without dragging the comment
 * affordance with it.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Per-comment idempotent
 * upvotes).
 */
export function CommentUpvoteButton({
  promptId,
  commentKey,
  initialCount,
}: CommentUpvoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (submitting) return;
    const previousCount = count;
    const optimisticCount = previousCount + 1;
    setCount(optimisticCount);
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/prompts/${encodeURIComponent(promptId)}/comments/${encodeURIComponent(
          commentKey,
        )}/upvote`,
        { method: "POST" },
      );
      if (!response.ok) {
        setCount(previousCount);
        return;
      }
      const data = (await response.json()) as { count?: number };
      if (typeof data.count === "number") {
        setCount(data.count);
      }
      // Deliberately no `router.refresh()` here — a refresh while the
      // modal is open would re-mount the `<dialog>` and reset every
      // comment's count to the server projection, which lags this
      // optimistic update by one round-trip. The next navigation
      // picks up the authoritative count.
    } catch {
      setCount(previousCount);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      aria-label={`Upvote comment (${count})`}
      className="inline-flex items-center gap-1 rounded-md text-xs text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden="true">👍</span>
      <span>{count}</span>
    </button>
  );
}
