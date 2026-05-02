## ADDED Requirements

### Requirement: Comments thread modal
The system SHALL render the full comments thread for a prompt inside a
modal that opens from the comment indicator on the prompt card. The
modal SHALL show the full prompt body alongside the comments list, the
comment input, and per-comment reply and upvote controls.

#### Scenario: Opening the modal
- **WHEN** a Viewer clicks the comment indicator on a prompt card
- **THEN** a modal SHALL open displaying the full prompt body in the
  left column and the comments thread plus a comment input in the right
  column
- **AND** the modal SHALL be dismissable via an X control, the ESC key,
  and clicking the backdrop

#### Scenario: Posting a comment from the modal
- **WHEN** a Viewer types a non-empty body into the modal's comment
  input and submits "Post Comment"
- **THEN** the comment SHALL be appended to the prompt's `comments`
  array and SHALL appear at the end of the comments list inside the
  modal without a full-page reload

#### Scenario: Card no longer carries an inline comment form
- **WHEN** a Viewer views a prompt card on `/prompts`
- **THEN** the card SHALL NOT render an inline `<details>`/`<summary>`
  comment accordion
- **AND** the only comment-write surface SHALL be the modal

### Requirement: Per-comment idempotent upvotes
The system SHALL expose `POST
/api/prompts/[id]/comments/[commentKey]/upvote` that toggles the
calling user's upvote on a single comment. A duplicate request from the
same user SHALL be a no-op rather than a double-count.

#### Scenario: First upvote on a comment
- **WHEN** a Viewer who has not previously upvoted a comment POSTs to
  the comment's upvote endpoint
- **THEN** the comment's `upvotes` array SHALL gain an entry
  `{ userEmail, createdAt }` for that user
- **AND** the response body SHALL include the new `count`

#### Scenario: Toggling off
- **WHEN** the same user POSTs to the comment's upvote endpoint a
  second time
- **THEN** their entry SHALL be removed from the comment's `upvotes`
- **AND** the response SHALL reflect the decremented count

#### Scenario: Comment not found
- **WHEN** a request targets a `commentKey` that does not exist on the
  prompt
- **THEN** the API SHALL respond with HTTP 404
- **AND** SHALL NOT mutate any document

#### Scenario: Audit row written
- **WHEN** the per-comment upvote endpoint mutates the prompt
- **THEN** exactly one ChangeLog row SHALL be written per call, with
  `documentType=prompt` and `field` naming the comment-upvote path

### Requirement: Single-level threaded replies
The system SHALL support exactly one nesting level of comment replies. A
comment MAY reference another comment on the same prompt via an optional
`parentKey` string. A reply SHALL be stored as a top-level entry in the
same `comments` array — there SHALL NOT be a separate replies field. A
reply SHALL NOT itself accept further replies in v1.

#### Scenario: Posting a reply
- **WHEN** a Viewer submits a comment with `parentKey` set to the
  `_key` of an existing comment on the same prompt
- **THEN** the new comment SHALL be appended with `parentKey`
  populated and SHALL render indented under its parent in the modal

#### Scenario: Invalid parentKey rejected
- **WHEN** a request submits a `parentKey` that does not match any
  existing comment on the prompt
- **THEN** the API SHALL respond with HTTP 400
- **AND** SHALL NOT append anything

#### Scenario: No reply-of-a-reply in v1
- **WHEN** a Viewer views a comment that already has `parentKey` set
- **THEN** the modal SHALL NOT render a Reply control on that comment
- **AND** the API contract documents this as v1 scope, not a permanent
  limit

### Requirement: Author identity protection in comment payloads
The list-and-modal projection SHALL surface comment author display
name only. The author's email address SHALL NOT appear in any client-
visible field. Avatar colours SHALL be derived from a stable, opaque
seed (e.g. a hash) so repeat authors render consistently without
exposing the underlying email.

#### Scenario: Author email never returned
- **WHEN** the prompts list query runs and a prompt has comments
- **THEN** each comment in the response SHALL include `authorName`,
  `body`, `createdAt`, `upvoteCount`, and `parentKey`
- **AND** the response SHALL NOT include `userEmail` for any comment

## MODIFIED Requirements

### Requirement: Prompt card content
Each prompt card SHALL show: title, author display name and date with
an avatar circle bearing the author's initials, a tool pill, tag pills
with per-tag colour families, the prompt body in a tinted box with a
copy control, and a footer with an upvote button, a comment button
that opens the modal, and a black Copy pill.

#### Scenario: Copy to clipboard from the card
- **WHEN** a Viewer clicks the Copy pill on a prompt card
- **THEN** the prompt body SHALL be copied to the clipboard as plain
  text
- **AND** the button SHALL briefly display a "Copied" confirmation

#### Scenario: Tool pill
- **WHEN** a prompt has a `tool` value of `copilot`
- **THEN** the card SHALL render a pill labelled "Copilot" with the
  shared colour mapping used elsewhere on the page

#### Scenario: Tag pills colour family
- **WHEN** a card renders its tags
- **THEN** each tag SHALL pick its colour family from the shared map
  in `lib/prompts/types.ts` so the same tag always renders with the
  same colour family across the page
- **AND** when more than three tags are present the card SHALL show
  the first three plus a `+N` overflow indicator

#### Scenario: Comment indicator opens the modal
- **WHEN** a Viewer clicks the comment indicator in the card header,
  or the `💬 (N)` footer button
- **THEN** the comments modal for that prompt SHALL open

### Requirement: Comments
The system SHALL expose `POST /api/prompts/[id]/comments` appending a
comment `{ userEmail, body, createdAt, parentKey? }` to a prompt. The
endpoint SHALL accept an optional `parentKey` field that, when
present, MUST match the `_key` of an existing comment on the prompt.

#### Scenario: Adding a top-level comment
- **WHEN** a Viewer submits a non-empty comment body without a
  `parentKey`
- **THEN** the comment SHALL be appended to the prompt's `comments`
  array with `parentKey` unset
- **AND** the response body SHALL include both the authoritative
  `count` and the appended comment object so the client can render
  it without a re-fetch

#### Scenario: Adding a reply
- **WHEN** a Viewer submits a non-empty comment body with `parentKey`
  set to the `_key` of an existing comment on the same prompt
- **THEN** the comment SHALL be appended with `parentKey` populated

#### Scenario: parentKey must reference a real comment
- **WHEN** a request supplies a `parentKey` that is not present on the
  prompt
- **THEN** the API SHALL respond with HTTP 400
- **AND** SHALL NOT append anything

#### Scenario: Empty comment rejected
- **WHEN** a Viewer submits an empty or whitespace-only comment body
- **THEN** the API SHALL respond with HTTP 400
- **AND** SHALL NOT append anything
