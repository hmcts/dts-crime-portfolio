import "server-only";

import { NextResponse } from "next/server";

import { resolveUser } from "@/lib/auth/resolver";
import { withRequestLogging } from "@/lib/logging/withLogging";
import { getSanityClient } from "@/lib/sanity/client";
import {
  commitWithChangeLog,
  type FieldChange,
} from "@/lib/sanity/transaction";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface CommentEntry {
  _key: string;
  userEmail: string;
  body: string;
  createdAt: string;
  parentKey?: string;
}

interface PromptForComment {
  _id: string;
  comments: CommentEntry[] | null;
}

const PROMPT_FOR_COMMENT_QUERY = /* groq */ `
  *[_type == "prompt" && _id == $id][0] {
    _id,
    comments
  }
`;

/**
 * POST /api/prompts/[id]/comments
 *
 * Append a comment to a prompt. Body must contain a non-empty `body`
 * string and may include an optional `parentKey` referencing the `_key`
 * of an existing comment on the same prompt to make the new entry a
 * reply (single nesting level — see
 * `openspec/specs/prompts-library/spec.md` "Single-level threaded
 * replies"). The author email always comes from the auth resolver,
 * never from the request body. Every successful write produces one
 * ChangeLog row recording the before/after comments arrays.
 *
 * Response: `{ count, comment }` — `count` is the new comments-array
 * length, `comment` is the appended entry (without `userEmail`) so the
 * client can render without a re-fetch.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { body: rawBody, parentKey: rawParentKey } = body as {
    body?: unknown;
    parentKey?: unknown;
  };
  const commentBody = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!commentBody) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }
  // `parentKey` is optional but, when present, must be a non-empty
  // string. We validate the actual key exists on the prompt below, after
  // the fetch.
  let parentKey: string | undefined;
  if (rawParentKey !== undefined && rawParentKey !== null && rawParentKey !== "") {
    if (typeof rawParentKey !== "string") {
      return NextResponse.json(
        { error: "parentKey must be a string" },
        { status: 400 },
      );
    }
    parentKey = rawParentKey;
  }

  const client = getSanityClient();
  const prompt = await client.fetch<PromptForComment | null>(PROMPT_FOR_COMMENT_QUERY, {
    id,
  });
  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const before: CommentEntry[] = Array.isArray(prompt.comments) ? prompt.comments : [];

  if (parentKey !== undefined) {
    const parent = before.find((entry) => entry._key === parentKey);
    if (!parent) {
      return NextResponse.json(
        { error: "parentKey does not match any existing comment on this prompt" },
        { status: 400 },
      );
    }
    // No reply-of-a-reply in v1: reject if the named parent already has
    // its own parentKey set. Spec scenario: "No reply-of-a-reply in v1".
    if (parent.parentKey) {
      return NextResponse.json(
        { error: "Cannot reply to a reply (v1 supports a single nesting level)" },
        { status: 400 },
      );
    }
  }

  const newEntry: CommentEntry = {
    _key: crypto.randomUUID(),
    userEmail: user.email,
    body: commentBody,
    createdAt: new Date().toISOString(),
    ...(parentKey !== undefined ? { parentKey } : {}),
  };
  const after: CommentEntry[] = [...before, newEntry];

  const changes: FieldChange[] = [
    {
      documentId: prompt._id,
      documentType: "prompt",
      field: "comments",
      before,
      after,
    },
  ];

  await commitWithChangeLog({
    mutations: (transaction) =>
      transaction.patch(prompt._id, {
        setIfMissing: { comments: [] },
        insert: { after: "comments[-1]", items: [newEntry] },
      }),
    changes,
    userEmail: user.email,
    client,
  });

  // The client gets the appended entry without `userEmail` so the
  // public read shape never carries author email — same posture as
  // the list query.
  const safeComment = {
    _key: newEntry._key,
    body: newEntry.body,
    createdAt: newEntry.createdAt,
    parentKey: newEntry.parentKey ?? null,
  };

  return NextResponse.json({ count: after.length, comment: safeComment });
}

export const POST = withRequestLogging(handlePost);
