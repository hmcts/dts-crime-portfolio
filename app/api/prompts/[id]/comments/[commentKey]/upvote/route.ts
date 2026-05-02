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
  params: Promise<{ id: string; commentKey: string }>;
}

interface CommentUpvoteEntry {
  _key: string;
  userEmail: string;
  createdAt: string;
}

interface CommentEntry {
  _key: string;
  userEmail: string;
  body: string;
  createdAt: string;
  parentKey?: string;
  upvotes?: CommentUpvoteEntry[] | null;
}

interface PromptForCommentUpvote {
  _id: string;
  comments: CommentEntry[] | null;
}

const PROMPT_FOR_COMMENT_UPVOTE_QUERY = /* groq */ `
  *[_type == "prompt" && _id == $id][0] {
    _id,
    comments
  }
`;

/**
 * POST /api/prompts/[id]/comments/[commentKey]/upvote
 *
 * Idempotent toggle scoped to a single comment. If the caller's email is
 * already in the comment's `upvotes` array it is removed; otherwise a
 * fresh entry is appended. The mutation is applied as a `set` on the
 * full `comments` array — that's the simplest way to address the inner
 * upvote array without crafting a long array-position selector, and the
 * arrays are small. Every write produces one ChangeLog row recording
 * the before/after comments arrays, with the resolver-supplied email.
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

  const client = getSanityClient();
  const prompt = await client.fetch<PromptForCommentUpvote | null>(
    PROMPT_FOR_COMMENT_UPVOTE_QUERY,
    { id },
  );
  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const beforeComments: CommentEntry[] = Array.isArray(prompt.comments)
    ? prompt.comments
    : [];
  const targetIndex = beforeComments.findIndex((entry) => entry._key === commentKey);
  if (targetIndex === -1) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const targetBefore = beforeComments[targetIndex]!;
  const upvotesBefore: CommentUpvoteEntry[] = Array.isArray(targetBefore.upvotes)
    ? targetBefore.upvotes
    : [];
  const alreadyUpvoted = upvotesBefore.some((entry) => entry.userEmail === user.email);
  const upvotesAfter: CommentUpvoteEntry[] = alreadyUpvoted
    ? upvotesBefore.filter((entry) => entry.userEmail !== user.email)
    : [
        ...upvotesBefore,
        {
          _key: crypto.randomUUID(),
          userEmail: user.email,
          createdAt: new Date().toISOString(),
        },
      ];

  const targetAfter: CommentEntry = { ...targetBefore, upvotes: upvotesAfter };
  const afterComments: CommentEntry[] = beforeComments.map((entry, index) =>
    index === targetIndex ? targetAfter : entry,
  );

  const changes: FieldChange[] = [
    {
      documentId: prompt._id,
      documentType: "prompt",
      field: `comments[_key=="${commentKey}"].upvotes`,
      before: upvotesBefore,
      after: upvotesAfter,
    },
  ];

  await commitWithChangeLog({
    mutations: (transaction) =>
      transaction.patch(prompt._id, { set: { comments: afterComments } }),
    changes,
    userEmail: user.email,
    client,
  });

  // `voted` reflects the caller's status AFTER the toggle so the client
  // can sync its per-comment "I have voted" indicator to the server's
  // truth without an extra round-trip.
  return NextResponse.json({ count: upvotesAfter.length, voted: !alreadyUpvoted });
}

export const POST = withRequestLogging(handlePost);
