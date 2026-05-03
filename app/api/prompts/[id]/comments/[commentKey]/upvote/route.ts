import "server-only";

import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { writeChangeLog } from "@/lib/audit/changelog";
import { resolveUser } from "@/lib/auth/resolver";
import { getDb } from "@/lib/db/client";
import { promptCommentUpvotes, promptComments } from "@/lib/db/schema";
import { withRequestLogging } from "@/lib/logging/withLogging";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string; commentKey: string }>;
}

/**
 * POST /api/prompts/[id]/comments/[commentKey]/upvote
 *
 * Idempotent toggle on `prompt_comment_upvotes`. Same shape as the
 * prompt-level upvote — composite (comment_id, user_email) PK keeps
 * idempotency in the DB, and the toggle flips between insert and
 * delete. The comment must belong to the named prompt; otherwise 404.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Per-comment idempotent
 * upvotes), openspec/specs/change-tracking/spec.md.
 */
async function handlePost(_request: Request, context: RouteContext): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  const { id, commentKey } = await context.params;
  const db = getDb();

  const [comment] = await db
    .select({ id: promptComments.id })
    .from(promptComments)
    .where(
      and(eq(promptComments.id, commentKey), eq(promptComments.promptId, id)),
    )
    .limit(1);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(promptCommentUpvotes)
    .where(
      and(
        eq(promptCommentUpvotes.commentId, commentKey),
        eq(promptCommentUpvotes.userEmail, user.email),
      ),
    )
    .limit(1);
  const alreadyUpvoted = !!existing;

  if (alreadyUpvoted) {
    await db
      .delete(promptCommentUpvotes)
      .where(
        and(
          eq(promptCommentUpvotes.commentId, commentKey),
          eq(promptCommentUpvotes.userEmail, user.email),
        ),
      );
  } else {
    await db.insert(promptCommentUpvotes).values({
      commentId: commentKey,
      userEmail: user.email,
      createdAt: new Date(),
    });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(promptCommentUpvotes)
    .where(eq(promptCommentUpvotes.commentId, commentKey));

  const userKey = createHash("sha256").update(user.email).digest("hex").slice(0, 16);
  await writeChangeLog(
    [
      {
        documentId: id,
        documentType: "prompt",
        field: `comments[id="${commentKey}"].upvotes`,
        before: { user: userKey, voted: alreadyUpvoted },
        after: { user: userKey, voted: !alreadyUpvoted, count },
      },
    ],
    user.email,
  );

  return NextResponse.json({ count, voted: !alreadyUpvoted });
}

export const POST = withRequestLogging(handlePost);
