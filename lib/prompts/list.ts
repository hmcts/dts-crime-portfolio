import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  promptCommentUpvotes,
  promptComments,
  promptUpvotes,
  prompts as promptsTable,
} from "@/lib/db/schema";

import type { PromptFilters } from "./filters";
import type {
  PromptComment,
  PromptListItem,
  PromptTag,
  PromptTool,
} from "./types";

/**
 * Backed by Postgres (via Drizzle). The earlier GROQ projection drove a
 * deep join through Sanity inline arrays; the equivalent here is four
 * focused queries (prompts, prompt-upvote counts, comments, per-comment
 * upvote counts) that we assemble into the same `PromptListItem` shape
 * the page already consumes — no caller change.
 *
 * Author email never leaves the server: we project `authorName` and
 * `authorSeed` only, matching the privacy posture in the spec. The
 * caller's own email is threaded through as `userEmail` to compute
 * `hasUserUpvoted` per prompt and per comment.
 *
 * Tag filtering happens in-memory via `applyPromptFilters` (filters.ts)
 * — the call sites already do that on the result. Tool is optionally
 * pushed down into SQL.
 *
 * Spec: openspec/specs/prompts-library/spec.md.
 */
export async function fetchPrompts(
  filters: PromptFilters,
  userEmail: string | null,
): Promise<PromptListItem[]> {
  const db = getDb();

  // 1. Prompts. Tool filter is the only one cheap to push down — tags
  // are an unbounded set and stay in JS so we can keep one path.
  const conditions = filters.tool
    ? [eq(promptsTable.tool, filters.tool)]
    : [];
  const baseRows = await db
    .select()
    .from(promptsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(promptsTable.createdAt));

  if (baseRows.length === 0) return [];

  const promptIds = baseRows.map((row) => row.id);

  // 2. Prompt upvote aggregates. We pull every (prompt_id, user_email)
  // for the prompts in scope; counting + the per-caller "voted?" flag
  // both fall out of one set scan.
  const promptUpvoteRows = await db
    .select({
      promptId: promptUpvotes.promptId,
      userEmail: promptUpvotes.userEmail,
    })
    .from(promptUpvotes)
    .where(inArray(promptUpvotes.promptId, promptIds));

  const promptUpvoteCounts = new Map<string, number>();
  const promptVotedByUser = new Map<string, boolean>();
  for (const row of promptUpvoteRows) {
    promptUpvoteCounts.set(
      row.promptId,
      (promptUpvoteCounts.get(row.promptId) ?? 0) + 1,
    );
    if (userEmail && row.userEmail === userEmail) {
      promptVotedByUser.set(row.promptId, true);
    }
  }

  // 3. Comments for those prompts, oldest first so the modal renders
  // in the same order as the GROQ projection (`order(createdAt asc)`).
  const commentRows = await db
    .select()
    .from(promptComments)
    .where(inArray(promptComments.promptId, promptIds))
    .orderBy(asc(promptComments.createdAt));

  // 4. Comment upvote aggregates. Same pattern as #2.
  const commentIds = commentRows.map((c) => c.id);
  const commentUpvoteRows = commentIds.length
    ? await db
        .select({
          commentId: promptCommentUpvotes.commentId,
          userEmail: promptCommentUpvotes.userEmail,
        })
        .from(promptCommentUpvotes)
        .where(inArray(promptCommentUpvotes.commentId, commentIds))
    : [];
  const commentUpvoteCounts = new Map<string, number>();
  const commentVotedByUser = new Map<string, boolean>();
  for (const row of commentUpvoteRows) {
    commentUpvoteCounts.set(
      row.commentId,
      (commentUpvoteCounts.get(row.commentId) ?? 0) + 1,
    );
    if (userEmail && row.userEmail === userEmail) {
      commentVotedByUser.set(row.commentId, true);
    }
  }

  const commentsByPrompt = new Map<string, PromptComment[]>();
  for (const row of commentRows) {
    const list = commentsByPrompt.get(row.promptId) ?? [];
    list.push({
      _key: row.id,
      authorName: row.authorName,
      authorSeed: row.authorSeed,
      body: row.body,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      upvoteCount: commentUpvoteCounts.get(row.id) ?? 0,
      hasUserUpvoted: commentVotedByUser.get(row.id) ?? false,
      parentKey: row.parentId,
    });
    commentsByPrompt.set(row.promptId, list);
  }

  return baseRows.map((row): PromptListItem => {
    const comments = commentsByPrompt.get(row.id) ?? [];
    return {
      _id: row.id,
      title: row.title,
      summary: row.summary,
      body: row.body,
      tool: row.tool as PromptTool,
      tags: (row.tags ?? []) as PromptTag[],
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      authorName: row.authorName,
      authorSeed: row.authorSeed,
      upvoteCount: promptUpvoteCounts.get(row.id) ?? 0,
      hasUserUpvoted: promptVotedByUser.get(row.id) ?? false,
      commentCount: comments.length,
      comments,
      competitionMonth: row.competitionMonth,
    };
  });
}

// Re-export so callers that imported `sql` from this file still work
// (none today, but keeping the import explicit so later additions can
// reach for an aggregate without re-importing).
export { sql };
