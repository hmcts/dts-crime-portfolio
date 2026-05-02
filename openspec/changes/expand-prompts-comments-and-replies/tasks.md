## 1. Schema

- [x] 1.1 Add `upvotes` array (`{ userEmail, createdAt }`) to
      `sanity/schemas/objects/promptComment.ts`
- [x] 1.2 Add optional `parentKey` string to
      `sanity/schemas/objects/promptComment.ts`

## 2. Types and projection

- [x] 2.1 Add `PromptComment` interface and a `comments` field to
      `PromptListItem` in `lib/prompts/types.ts`
- [x] 2.2 Add the per-tag colour map next to `PROMPT_TOOL_BADGE_CLASSES`
- [x] 2.3 Update the GROQ projection in `lib/prompts/list.ts` so
      `comments` is populated with author display name only and per-
      comment `upvoteCount` aggregated server-side

## 3. API

- [x] 3.1 Extend `POST /api/prompts/[id]/comments` to accept an optional
      `parentKey` and return the appended comment in the response
- [x] 3.2 Add `POST /api/prompts/[id]/comments/[commentKey]/upvote` —
      idempotent toggle scoped to the comment, ChangeLog row written

## 4. Components

- [x] 4.1 Redesign `components/prompts/PromptCard.tsx` to the reference
      (avatar with initials, tool pill, coloured tag pills, tinted
      PROMPT box, outlined footer buttons, black Copy pill)
- [x] 4.2 Build `components/prompts/PromptCommentsModal.tsx` — two-
      column modal with full prompt on the left and the comments thread
      on the right, including reply input and per-comment upvote button
- [x] 4.3 Build `components/prompts/CommentUpvoteButton.tsx` mirroring
      `UpvoteButton` semantics
- [x] 4.4 Refactor `components/prompts/CommentForm.tsx` — drop the
      `<details>`/`<summary>` accordion, optionally accept a
      `parentKey` and a `placeholder`

## 5. Tests

- [x] 5.1 Extend `tests/prompts-routes.test.ts` with cases for
      `parentKey` (valid/invalid) on the comment POST and for the new
      comment-upvote endpoint
- [x] 5.2 Add `playwright/tests/prompts-modal.spec.ts` — open the
      modal, post a comment, click a per-comment upvote, assert
      counts increment
- [x] 5.3 Validate with `openspec validate
      expand-prompts-comments-and-replies --strict`
