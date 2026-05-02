"use client";

import { useState } from "react";

import { avatarColourFor, avatarSeedFor, initialsFromName } from "@/lib/prompts/avatar";
import { formatPromptByline } from "@/lib/prompts/format";
import {
  PROMPT_TAG_BADGE_CLASSES,
  PROMPT_TAG_BADGE_FALLBACK,
  PROMPT_TOOL_BADGE_CLASSES,
  PROMPT_TOOL_LABELS,
  type PromptListItem,
  type PromptTag,
} from "@/lib/prompts/types";

import { CopyButton } from "./CopyButton";
import { PromptCommentsModal } from "./PromptCommentsModal";
import { UpvoteButton } from "./UpvoteButton";

const VISIBLE_TAGS = 3;

/**
 * Card view of a single prompt for `/prompts`. Designed against the
 * agreed reference: avatar circle bearing the author's initials, tool
 * pill in the byline, tag pills with per-tag colour families, the
 * prompt body in a tinted box, and a footer with outlined upvote /
 * comment buttons plus a black Copy pill.
 *
 * Clicking the comment indicator (top-right) or the comment button in
 * the footer opens the comments modal — comments themselves are no
 * longer posted from the card. See spec scenario "Card no longer
 * carries an inline comment form".
 */
export function PromptCard({ prompt }: { prompt: PromptListItem }) {
  const [modalOpen, setModalOpen] = useState(false);

  const toolColour = PROMPT_TOOL_BADGE_CLASSES[prompt.tool];
  const author = prompt.authorName ?? "Unknown";
  const initials = initialsFromName(author);
  const avatar = avatarColourFor(avatarSeedFor(prompt));

  const visibleTags = prompt.tags.slice(0, VISIBLE_TAGS);
  const overflow = Math.max(0, prompt.tags.length - VISIBLE_TAGS);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md">
      <header className="flex items-start justify-between gap-4">
        <h3 className="min-w-0 text-lg font-semibold tracking-tight text-neutral-900">
          {prompt.title}
        </h3>
        <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-600">
          <span aria-label={`${prompt.upvoteCount} upvotes`} className="inline-flex items-center gap-1">
            <span aria-hidden="true">↑</span>
            <span>{prompt.upvoteCount}</span>
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label={`Open comments (${prompt.commentCount})`}
            className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900"
          >
            <span aria-hidden="true">💬</span>
            <span>{prompt.commentCount}</span>
          </button>
        </div>
      </header>

      <div className="mt-3 flex items-center gap-3">
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
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>{formatPromptByline(prompt.createdAt)}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${toolColour.bg} ${toolColour.fg}`}
            >
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-current opacity-60" />
              {PROMPT_TOOL_LABELS[prompt.tool]}
            </span>
          </div>
        </div>
      </div>

      {prompt.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          {visibleTags.map((tag) => {
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
          {overflow > 0 && (
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
              +{overflow}
            </span>
          )}
        </div>
      )}

      {/* Clickable prompt body. Wrapping the tinted box in a `<button>`
          gives keyboard activation (Enter / Space) and a real focus ring
          for free; the `cursor-pointer` plus a hover tint communicate
          the affordance visually. The Copy overlay button stops its
          click from bubbling so it can still copy without launching the
          modal. The card title, byline, tags, and footer are NOT inside
          this button — clicking those areas does not open the modal. */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="Open comments"
        data-testid="prompt-body-button"
        className="group relative mt-3 block w-full cursor-pointer rounded-xl bg-neutral-50 p-4 text-left hover:bg-neutral-100"
      >
        <div className="absolute right-3 top-3">
          <CopyButton
            value={prompt.body}
            label="Copy prompt"
            variant="icon"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/80 text-neutral-600 hover:bg-white hover:text-neutral-900"
          />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Prompt
        </p>
        <pre className="mt-2 max-h-32 overflow-hidden whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-800">
          {truncateForCard(prompt.body)}
        </pre>
      </button>

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-100 pt-4 text-xs text-neutral-700">
        <div className="flex items-center gap-2">
          <UpvoteButton
            promptId={prompt._id}
            initialCount={prompt.upvoteCount}
            initialVoted={prompt.hasUserUpvoted}
          />
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label={`Open comments (${prompt.commentCount})`}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
          >
            <span aria-hidden="true">💬</span>
            <span>({prompt.commentCount})</span>
          </button>
        </div>
        <CopyButton
          value={prompt.body}
          label="Copy"
          className="inline-flex items-center rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700"
        />
      </footer>

      {modalOpen && (
        <PromptCommentsModal prompt={prompt} onClose={() => setModalOpen(false)} />
      )}
    </article>
  );
}

/**
 * Truncate the prompt body for the card preview. We keep enough lines
 * for the design (4-5) and append a literal ellipsis so the user can
 * tell there's more to read in the modal.
 */
function truncateForCard(body: string): string {
  const limit = 200;
  if (body.length <= limit) return body;
  return body.slice(0, limit).trimEnd() + "…";
}
