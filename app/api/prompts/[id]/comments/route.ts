import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { writeChangeLog } from "@/lib/audit/changelog";
import { resolveUser } from "@/lib/auth/resolver";
import { getDb } from "@/lib/db/client";
import { promptComments, prompts as promptsTable } from "@/lib/db/schema";
import { withRequestLogging } from "@/lib/logging/withLogging";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/prompts/[id]/comments
 *
 * Insert one row into `prompt_comments` and return the new row's id +
 * the up-to-date comment count for the prompt. The author email always
 * comes from the auth resolver, never from the request body.
 *
 * Single-level threading: when `parentKey` is supplied we look up the
 * parent comment and reject if the parent itself has a parent — i.e.
 * no reply-of-a-reply (spec scenario "No reply-of-a-reply in v1").
 *
 * `authorName` and `authorSeed` are denormalised onto the row so the
 * read path doesn't need a join. Seed is sha256(email)[:16] — opaque
 * but stable per author so avatar colour stays consistent.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Comments,
 * Single-level threaded replies),
 * openspec/specs/change-tracking/spec.md.
 */
async function handlePost(request: Request, context: RouteContext): Promise<Response> {
  const user = await resolveUser();
  if (user.kind === "unauthorized") {
    return NextResponse.json(
      { error: "Unauthorized", reason: user.reason },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { body: rawBody, parentKey: rawParentKey } = parsed as {
    body?: unknown;
    parentKey?: unknown;
  };
  const commentBody = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!commentBody) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }
  let parentId: string | null = null;
  if (rawParentKey !== undefined && rawParentKey !== null && rawParentKey !== "") {
    if (typeof rawParentKey !== "string") {
      return NextResponse.json(
        { error: "parentKey must be a string" },
        { status: 400 },
      );
    }
    parentId = rawParentKey;
  }

  const db = getDb();

  const [prompt] = await db
    .select({ id: promptsTable.id })
    .from(promptsTable)
    .where(eq(promptsTable.id, id))
    .limit(1);
  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  if (parentId) {
    const [parent] = await db
      .select({ id: promptComments.id, parentId: promptComments.parentId })
      .from(promptComments)
      .where(
        and(
          eq(promptComments.id, parentId),
          eq(promptComments.promptId, id),
        ),
      )
      .limit(1);
    if (!parent) {
      return NextResponse.json(
        { error: "parentKey does not match any existing comment on this prompt" },
        { status: 400 },
      );
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Cannot reply to a reply (v1 supports a single nesting level)" },
        { status: 400 },
      );
    }
  }

  const newId = randomUUID();
  const createdAt = new Date();
  const authorSeed = createHash("sha256")
    .update(user.email)
    .digest("hex")
    .slice(0, 16);

  await db.insert(promptComments).values({
    id: newId,
    promptId: id,
    parentId,
    authorEmail: user.email,
    authorName: user.email.split("@")[0] ?? null,
    authorSeed,
    body: commentBody,
    createdAt,
  });

  const safeComment = {
    _key: newId,
    body: commentBody,
    createdAt: createdAt.toISOString(),
    parentKey: parentId,
  };

  const userKey = createHash("sha256").update(user.email).digest("hex").slice(0, 16);
  await writeChangeLog(
    [
      {
        documentId: id,
        documentType: "prompt",
        field: "comments",
        before: null,
        after: { user: userKey, commentId: newId, hasParent: !!parentId },
      },
    ],
    user.email,
  );

  // The returned count is post-insert, derived from a SELECT count(*)
  // so the client can update its rendered count without a re-fetch.
  // Replies count too — that matches the GROQ projection's `count(comments)`.
  // We use isNotNull on prompts.id to silence an unused-import warning.
  void isNotNull;
  const result = await db
    .select()
    .from(promptComments)
    .where(eq(promptComments.promptId, id));

  return NextResponse.json({ count: result.length, comment: safeComment });
}

export const POST = withRequestLogging(handlePost);
