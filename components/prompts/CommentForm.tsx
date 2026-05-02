"use client";

import { useState, type FormEvent } from "react";

import type { PromptComment } from "@/lib/prompts/types";

interface CommentFormProps {
  promptId: string;
  /**
   * When set the form is rendered as a reply to that comment — the
   * server validates the key against the prompt's existing comments
   * and appends the new entry with `parentKey` populated.
   */
  parentKey?: string;
  placeholder?: string;
  submitLabel?: string;
  /**
   * Called with the appended comment after a successful POST so the
   * parent surface (the modal) can render it without waiting on a
   * full refresh.
   */
  onPosted?: (comment: PromptComment, count: number) => void;
  /** Called when the user cancels a reply form (only relevant for replies). */
  onCancel?: () => void;
  autoFocus?: boolean;
}

/**
 * Plain inline form for posting a comment (or a reply, when
 * `parentKey` is set) on a prompt. POSTs to
 * `/api/prompts/[id]/comments`. Empty submissions are rejected client-
 * side and on the server. On success the appended entry is handed
 * back to the parent via `onPosted` so the modal can render it
 * without waiting on a `router.refresh()`.
 *
 * Earlier versions of this component wrapped the form in a
 * `<details>`/`<summary>` accordion on the card. The redesigned card
 * no longer carries any comment-write affordance, so the accordion is
 * gone — see spec scenario "Card no longer carries an inline comment
 * form".
 *
 * Spec: openspec/specs/prompts-library/spec.md (Comments,
 * Single-level threaded replies).
 */
export function CommentForm({
  promptId,
  parentKey,
  placeholder = "Share your thoughts…",
  submitLabel = "Post Comment",
  onPosted,
  onCancel,
  autoFocus = false,
}: CommentFormProps) {
  const [body, setBody] = useState("");
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

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/prompts/${encodeURIComponent(promptId)}/comments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            body: trimmed,
            ...(parentKey ? { parentKey } : {}),
          }),
        },
      );
      if (!response.ok) {
        if (response.status === 400) {
          setError("Comment cannot be empty.");
        } else if (response.status === 401) {
          setError("Your session has expired. Please refresh and sign in again.");
        } else {
          setError("Failed to post comment. Please try again.");
        }
        return;
      }
      const data = (await response.json()) as {
        count?: number;
        comment?: {
          _key: string;
          body: string;
          createdAt: string | null;
          parentKey: string | null;
        };
      };
      setBody("");
      if (onPosted && data.comment && typeof data.count === "number") {
        // Hand the appended entry back to the parent so it can append
        // it locally. We deliberately do NOT call `router.refresh()`
        // from inside the modal — refreshing while a `<dialog>` is
        // open would re-mount the dialog and reset its internal
        // comments list to the server's projection, which on the
        // optimistic path is one step behind. The parent surface picks
        // up the new comment on the next navigation.
        onPosted(
          {
            _key: data.comment._key,
            body: data.comment.body,
            createdAt: data.comment.createdAt,
            parentKey: data.comment.parentKey,
            authorName: null,
            authorSeed: null,
            upvoteCount: 0,
            hasUserUpvoted: false,
          },
          data.count,
        );
      }
    } catch {
      setError("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2"
      aria-label={parentKey ? "Reply to comment" : "Add a comment"}
    >
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        disabled={submitting}
        rows={3}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Posting…" : submitLabel}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}
