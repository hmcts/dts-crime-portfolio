"use client";

import { useState } from "react";

interface CommentUpvoteButtonProps {
  promptId: string;
  commentKey: string;
  initialCount: number;
  initialVoted: boolean;
}

/**
 * Idempotent per-comment upvote toggle. POSTs to
 * `/api/prompts/[id]/comments/[commentKey]/upvote` and shows an
 * optimistic count + voted state, reverting on a non-2xx response. The
 * server is the source of truth — the response carries authoritative
 * `{ count, voted }`.
 *
 * Visually mirrors the prompt-level `UpvoteButton` (small thumb-up
 * indicator + count) but is intentionally a separate component so
 * the prompt-level button can evolve without dragging the comment
 * affordance with it.
 *
 * `aria-pressed` mirrors the voted state for assistive tech. The voted
 * appearance flips to a filled emerald palette so the user can see at
 * a glance whether they have already supported a particular comment.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Per-comment idempotent
 * upvotes).
 */
export function CommentUpvoteButton({
  promptId,
  commentKey,
  initialCount,
  initialVoted,
}: CommentUpvoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (submitting) return;
    const previousCount = count;
    const previousVoted = voted;
    const optimisticVoted = !previousVoted;
    const optimisticCount = previousCount + (optimisticVoted ? 1 : -1);
    setCount(optimisticCount);
    setVoted(optimisticVoted);
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
        setVoted(previousVoted);
        return;
      }
      const data = (await response.json()) as { count?: number; voted?: boolean };
      if (typeof data.count === "number") {
        setCount(data.count);
      }
      if (typeof data.voted === "boolean") {
        setVoted(data.voted);
      }
      // Deliberately no `router.refresh()` here — a refresh while the
      // modal is open would re-mount the `<dialog>` and reset every
      // comment's count to the server projection, which lags this
      // optimistic update by one round-trip. The next navigation
      // picks up the authoritative count.
    } catch {
      setCount(previousCount);
      setVoted(previousVoted);
    } finally {
      setSubmitting(false);
    }
  }

  const palette = voted
    ? "bg-emerald-100 text-emerald-800 hover:text-emerald-900"
    : "text-neutral-600 hover:text-neutral-900";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      aria-pressed={voted}
      aria-label={`Upvote comment (${count})`}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs disabled:cursor-not-allowed disabled:opacity-60 ${palette}`}
    >
      <span aria-hidden="true">👍</span>
      <span>{count}</span>
    </button>
  );
}
