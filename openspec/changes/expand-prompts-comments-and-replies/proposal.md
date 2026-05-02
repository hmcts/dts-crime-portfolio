## Why

The current `/prompts` card shows a comment count but no way to read the
thread, no way to upvote individual comments, and no way to reply to a
specific comment. The PM signed off two reference designs (a redesigned
card and a comments modal) and wants the missing functionality wired up
end to end so the demo dataset has a believable conversation around each
prompt.

The current card also embeds an inline `<details>` accordion comment
form, which collides with the new design's modal-only conversation
surface and exposes a write-affordance from the listing surface that
testers consistently mistook for "post a new prompt".

## What Changes

- Render the prompt card to match the new reference: avatar circle with
  initials, tool pill, tag pills with per-tag colour families, prompt
  body in a tinted box, outlined upvote and comment buttons, and a black
  pill Copy button.

- Add a comments modal that opens when the user clicks the comment
  indicator (or the "💬 (N)" footer button) on a card. The modal renders
  the full prompt body alongside the full comments list, the comment
  form (no accordion), and a Reply control under each comment.

- Add per-comment idempotent upvotes via a new
  `POST /api/prompts/[id]/comments/[commentKey]/upvote` endpoint that
  mirrors the existing prompt-level upvote contract — one entry per
  email, duplicate clicks toggle off.

- Allow a comment to reference another comment's `_key` via a new
  optional `parentKey` field. Replies render indented under their parent
  in the modal. Single-level only — a reply does not have its own reply
  affordance in v1.

- Extend the prompts list GROQ projection so the modal renders off the
  prompt object the page already has. Author email is never returned —
  the response only carries display name and an opaque, stable colour
  seed.

- Remove the card-level `<details>` comment form. The modal is now the
  sole comment surface.

## Capabilities

### New Capabilities

None. This change extends the existing `prompts-library` capability.

### Modified Capabilities

- `prompts-library`: comments are now read and posted from a modal
  attached to each card, comments support per-comment idempotent
  upvotes, and a comment can be a reply to another comment via an
  optional `parentKey`.

## Impact

- **Schema:** `promptComment` gains `upvotes` (array of
  `{ userEmail, createdAt }`) and `parentKey` (optional string). No
  other schema changes.
- **API:** existing comment POST extended to accept `parentKey`; new
  per-comment upvote toggle endpoint. Both write through
  `commitWithChangeLog` so audit history is consistent.
- **Frontend:** card and modal redesign; `CommentForm` becomes a plain
  inline form used only inside the modal.
- **Data:** existing prompts continue to work — `parentKey` is optional
  and `upvotes` is allowed to be absent. Demo seed is enriched in a
  follow-up commit so the modal has realistic threads.
- **Privacy:** author email continues to be excluded from the public
  read view. Per-comment upvotes are stored against email server-side
  (for idempotency) but never surface to the client.
