"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UpvoteButtonProps {
  promptId: string;
  initialCount: number;
  initialVoted: boolean;
}

/**
 * Idempotent upvote toggle. POSTs to `/api/prompts/[id]/upvote` and shows
 * an optimistic count + voted state, reverting on a non-2xx response. The
 * server is the source of truth — the response carries authoritative
 * `{ count, voted }`.
 *
 * The button has two visual states:
 *   - voted (filled emerald background) — the calling user is in the
 *     prompt's upvote roster.
 *   - not voted (white background) — the calling user is absent.
 *
 * `aria-pressed` mirrors the `voted` state so assistive tech reads the
 * toggle out cleanly. The icon (flame) does not change on toggle — the
 * fill colour and `aria-pressed` carry the state instead.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Idempotent upvotes).
 */
export function UpvoteButton({
  promptId,
  initialCount,
  initialVoted,
}: UpvoteButtonProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (submitting) return;
    const previousCount = count;
    const previousVoted = voted;
    // Optimistically toggle BOTH count and voted state. If the server
    // disagrees (or the network drops), the catch/!ok branches restore
    // the previous values so the UI doesn't "stick" in a wrong state.
    const optimisticVoted = !previousVoted;
    const optimisticCount = previousCount + (optimisticVoted ? 1 : -1);
    setCount(optimisticCount);
    setVoted(optimisticVoted);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/prompts/${encodeURIComponent(promptId)}/upvote`, {
        method: "POST",
      });
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
      router.refresh();
    } catch {
      setCount(previousCount);
      setVoted(previousVoted);
    } finally {
      setSubmitting(false);
    }
  }

  const palette = voted
    ? "border-emerald-300 bg-emerald-100 text-emerald-800 hover:border-emerald-400"
    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      aria-pressed={voted}
      aria-label={`Upvote (${count})`}
      data-testid="prompt-upvote-button"
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${palette}`}
    >
      <span aria-hidden="true">🔥</span>
      <span>{count}</span>
    </button>
  );
}
