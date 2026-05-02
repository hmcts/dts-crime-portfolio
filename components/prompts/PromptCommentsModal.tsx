"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { avatarColourFor, avatarSeedFor, initialsFromName } from "@/lib/prompts/avatar";
import { formatPromptByline, formatRelativeTimeAgo } from "@/lib/prompts/format";
import {
  PROMPT_TAG_BADGE_CLASSES,
  PROMPT_TAG_BADGE_FALLBACK,
  PROMPT_TOOL_BADGE_CLASSES,
  PROMPT_TOOL_LABELS,
  type PromptComment,
  type PromptListItem,
  type PromptTag,
} from "@/lib/prompts/types";

import { CommentForm } from "./CommentForm";
import { CommentUpvoteButton } from "./CommentUpvoteButton";
import { CopyButton } from "./CopyButton";

interface PromptCommentsModalProps {
  prompt: PromptListItem;
  onClose: () => void;
}

/**
 * Two-column modal that opens from a prompt card. Left column shows the
 * full prompt body (no truncation) with a copy control; right column
 * shows the full comments thread with a comment input pinned to the
 * top, scrollable list below, per-comment upvote and reply controls,
 * and replies indented under their parent.
 *
 * Built on the native `<dialog>` element so we get ESC-to-close, focus
 * trap, and the inert backdrop for free. On narrow widths the layout
 * collapses to a single column with the comments stacked below the
 * prompt.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Comments thread modal,
 * Single-level threaded replies, Per-comment idempotent upvotes).
 */
export function PromptCommentsModal({ prompt, onClose }: PromptCommentsModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [comments, setComments] = useState<PromptComment[]>(prompt.comments ?? []);
  const [activeReplyKey, setActiveReplyKey] = useState<string | null>(null);

  // Open the dialog imperatively so we benefit from native modal
  // semantics (ESC, focus trap, inert background). The `cancel`
  // event fires on ESC and on backdrop click in some browsers; we
  // bridge it back to React state so the parent gets `onClose`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const handleClose = () => onClose();
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      if (dialog.open) dialog.close();
    };
  }, [onClose]);

  const onBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    // The dialog itself receives the click when the user clicks on
    // the backdrop area outside the panel — by checking that the
    // event's target IS the dialog (not a descendant) we close on
    // backdrop click without closing on every internal click.
    if (event.target === dialogRef.current) {
      onClose();
    }
  };

  const handlePosted = (comment: PromptComment, _count: number) => {
    setComments((current) => [...current, comment]);
    setActiveReplyKey(null);
  };

  const tree = useMemo(() => buildTree(comments), [comments]);
  const author = prompt.authorName ?? "Unknown";
  const initials = initialsFromName(author);
  const avatar = avatarColourFor(avatarSeedFor(prompt));
  const toolColour = PROMPT_TOOL_BADGE_CLASSES[prompt.tool];

  return (
    <dialog
      ref={dialogRef}
      onClick={onBackdropClick}
      aria-label={`Comments — ${prompt.title}`}
      // `m-auto` plus explicit `inset-0` (top/right/bottom/left = 0) restore
      // the browser's default centering for `<dialog>`. The earlier `m-0`
      // suppressed the auto-margins that centre a fixed-position element,
      // so the dialog was rendered at the top-left of the viewport. The
      // `max-h-[85vh]` cap keeps the box short enough that the auto-margin
      // can resolve a vertical offset on tall viewports too.
      className="inset-0 m-auto w-full max-w-5xl max-h-[85vh] rounded-2xl p-0 backdrop:bg-neutral-900/40"
    >
      <div className="grid max-h-[85vh] grid-cols-1 gap-0 md:grid-cols-[3fr_2fr]">
        {/* Left column — full prompt */}
        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              {prompt.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 md:hidden"
            >
              ×
            </button>
          </div>

          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bg} ${avatar.fg}`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-neutral-900">
                {author}
              </p>
              <p className="text-xs text-neutral-500">{formatPromptByline(prompt.createdAt)}</p>
              <p className="mt-1 text-[11px] text-neutral-500">This prompt works for the following tool:</p>
              <span
                className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${toolColour.bg} ${toolColour.fg}`}
              >
                <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-current opacity-60" />
                {PROMPT_TOOL_LABELS[prompt.tool]}
              </span>
            </div>
          </div>

          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {prompt.tags.map((tag) => {
                const colour = PROMPT_TAG_BADGE_CLASSES[tag as PromptTag] ?? PROMPT_TAG_BADGE_FALLBACK;
                return (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${colour.bg} ${colour.fg}`}
                  >
                    <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${colour.dot}`} />
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          <div className="relative rounded-xl bg-neutral-50 p-4">
            <div className="absolute right-3 top-3">
              <CopyButton
                value={prompt.body}
                label="Copy prompt"
                variant="icon"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Prompt
            </p>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-800">
              {prompt.body}
            </pre>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-700">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">
              <span aria-hidden="true">↑</span>
              <span>{prompt.upvoteCount}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-neutral-600">
              <span aria-hidden="true">💬</span>
              <span>
                {comments.length} comment{comments.length === 1 ? "" : "s"}
              </span>
            </span>
          </div>
        </div>

        {/* Right column — comments */}
        <div className="flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 p-6 md:border-l md:border-t-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">
              Comments ({comments.length})
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="hidden h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 md:inline-flex"
            >
              ×
            </button>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <CommentForm
              promptId={prompt._id}
              onPosted={handlePosted}
              placeholder="Share your thoughts…"
            />
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {tree.length === 0 ? (
              <p className="text-xs text-neutral-500">
                No comments yet. Be the first to share your thoughts.
              </p>
            ) : (
              tree.map((node) => (
                <CommentNode
                  key={node._key}
                  comment={node}
                  replies={node.replies}
                  promptId={prompt._id}
                  activeReplyKey={activeReplyKey}
                  onToggleReply={(key) =>
                    setActiveReplyKey((current) => (current === key ? null : key))
                  }
                  onPosted={handlePosted}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}

interface CommentNodeProps {
  comment: PromptComment;
  replies: PromptComment[];
  promptId: string;
  activeReplyKey: string | null;
  onToggleReply: (key: string) => void;
  onPosted: (comment: PromptComment, count: number) => void;
}

function CommentNode({
  comment,
  replies,
  promptId,
  activeReplyKey,
  onToggleReply,
  onPosted,
}: CommentNodeProps) {
  const isReplyOpen = activeReplyKey === comment._key;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <CommentRow
        comment={comment}
        promptId={promptId}
        onToggleReply={onToggleReply}
        canReply
        isReplyOpen={isReplyOpen}
      />
      {isReplyOpen && (
        <div className="mt-2 border-l-2 border-neutral-200 pl-3">
          <CommentForm
            promptId={promptId}
            parentKey={comment._key}
            placeholder={`Reply to ${comment.authorName ?? "this comment"}…`}
            submitLabel="Post Reply"
            onPosted={(posted, count) => {
              onPosted(posted, count);
            }}
            onCancel={() => onToggleReply(comment._key)}
            autoFocus
          />
        </div>
      )}
      {replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-l-2 border-neutral-200 pl-3">
          {replies.map((reply) => (
            <CommentRow
              key={reply._key}
              comment={reply}
              promptId={promptId}
              onToggleReply={onToggleReply}
              canReply={false}
              isReplyOpen={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentRowProps {
  comment: PromptComment;
  promptId: string;
  canReply: boolean;
  isReplyOpen: boolean;
  onToggleReply: (key: string) => void;
}

function CommentRow({
  comment,
  promptId,
  canReply,
  isReplyOpen,
  onToggleReply,
}: CommentRowProps) {
  const author = comment.authorName ?? "Unknown";
  const initials = initialsFromName(author);
  const avatar = avatarColourFor(avatarSeedFor(comment));

  return (
    <div className="flex gap-3">
      <div
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatar.bg} ${avatar.fg}`}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold text-neutral-900">{author}</span>
          <span className="text-[11px] text-neutral-500">
            {formatRelativeTimeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-700">{comment.body}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-600">
          <CommentUpvoteButton
            promptId={promptId}
            commentKey={comment._key}
            initialCount={comment.upvoteCount}
            initialVoted={comment.hasUserUpvoted}
          />
          {canReply && (
            <button
              type="button"
              onClick={() => onToggleReply(comment._key)}
              aria-expanded={isReplyOpen}
              className="inline-flex items-center gap-1 hover:text-neutral-900"
            >
              <span aria-hidden="true">↩</span>
              <span>{isReplyOpen ? "Cancel reply" : "Reply"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentNodeWithReplies extends PromptComment {
  replies: PromptComment[];
}

/**
 * Group comments into top-level entries plus the replies under each.
 * Replies are flattened — by spec a reply cannot itself accept further
 * replies, so we never need to recurse beyond one level.
 */
function buildTree(comments: PromptComment[]): CommentNodeWithReplies[] {
  const tops = comments.filter((entry) => !entry.parentKey);
  const repliesByParent = new Map<string, PromptComment[]>();
  for (const entry of comments) {
    if (entry.parentKey) {
      const list = repliesByParent.get(entry.parentKey) ?? [];
      list.push(entry);
      repliesByParent.set(entry.parentKey, list);
    }
  }
  return tops.map((top) => ({
    ...top,
    replies: repliesByParent.get(top._key) ?? [],
  }));
}
