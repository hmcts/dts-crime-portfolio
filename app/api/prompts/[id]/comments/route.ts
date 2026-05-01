import "server-only";

import { NextResponse } from "next/server";

import { resolveUser } from "@/lib/auth/resolver";
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
 * string. The author email always comes from the auth resolver, never
 * from the request body. Every successful write produces one ChangeLog
 * row recording the before/after comments arrays.
 *
 * Spec: openspec/specs/prompts-library/spec.md (Comments),
 * openspec/specs/change-tracking/spec.md.
 */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
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

  const { body: rawBody } = body as { body?: unknown };
  const commentBody = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!commentBody) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  const client = getSanityClient();
  const prompt = await client.fetch<PromptForComment | null>(PROMPT_FOR_COMMENT_QUERY, {
    id,
  });
  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const before: CommentEntry[] = Array.isArray(prompt.comments) ? prompt.comments : [];
  const newEntry: CommentEntry = {
    _key: crypto.randomUUID(),
    userEmail: user.email,
    body: commentBody,
    createdAt: new Date().toISOString(),
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

  return NextResponse.json({ count: after.length });
}
