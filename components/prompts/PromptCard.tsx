import { formatPromptDate } from "@/lib/prompts/format";
import {
  PROMPT_TOOL_BADGE_CLASSES,
  PROMPT_TOOL_LABELS,
  type PromptListItem,
} from "@/lib/prompts/types";

import { CommentForm } from "./CommentForm";
import { CopyButton } from "./CopyButton";
import { UpvoteButton } from "./UpvoteButton";

/**
 * Card view of a single prompt for `/prompts`. Shows title, summary,
 * author + date, tool badge, tag chips, the prompt body in a monospace
 * `<pre>` block, a Copy button, an idempotent upvote toggle, and an
 * inline comment form. Upvote and comment counts come straight from the
 * GROQ aggregates — `UpvoteButton` and `CommentForm` reconcile against
 * the authoritative count returned by the write endpoint.
 */
export function PromptCard({ prompt }: { prompt: PromptListItem }) {
  const colour = PROMPT_TOOL_BADGE_CLASSES[prompt.tool];

  return (
    <article className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-neutral-900">
            {prompt.title}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            {(prompt.authorName ?? "Unknown") + " · " + formatPromptDate(prompt.createdAt)}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${colour.bg} ${colour.fg}`}
        >
          {PROMPT_TOOL_LABELS[prompt.tool]}
        </span>
      </header>
      {prompt.summary && (
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{prompt.summary}</p>
      )}
      {prompt.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          {prompt.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-800">
        {prompt.body}
      </pre>
      <footer className="mt-3 flex flex-col gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
        <div className="flex items-center justify-between gap-2">
          <UpvoteButton promptId={prompt._id} initialCount={prompt.upvoteCount} />
          <CopyButton value={prompt.body} />
        </div>
        <CommentForm promptId={prompt._id} initialCount={prompt.commentCount} />
      </footer>
    </article>
  );
}
