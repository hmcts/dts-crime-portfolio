## ADDED Requirements

### Requirement: Prompts page at /prompts
The system SHALL render a community prompt library at `/prompts` with a
monthly competition banner, tag chips, sort tabs, a "Share your own prompt"
CTA, and a card list of prompts.

#### Scenario: Default view
- **WHEN** a Viewer navigates to `/prompts`
- **THEN** the banner SHALL display the leader of the current month's prompt
  competition with title, author, and upvote count
- **AND** the sort tab SHALL default to `✨ Recommended`
- **AND** the page SHALL list every published prompt as a card

### Requirement: Prompt card content
Each prompt card SHALL show title, summary, author and date, tool badge,
tags, the prompt body in a monospace block, copy button, upvote count, and
comment count.

#### Scenario: Copy to clipboard
- **WHEN** a Viewer clicks the copy button on a prompt card
- **THEN** the prompt body SHALL be copied to the clipboard as plain text
- **AND** the button SHALL briefly display a "Copied" confirmation

#### Scenario: Tool badge
- **WHEN** a prompt has a `tool` value of `Copilot`
- **THEN** the card SHALL render a coloured badge labelled "Copilot"
- **AND** the same colour mapping SHALL apply across the page

### Requirement: Tag and tool filters
The page SHALL render tag chips (`#HR`, `#Tech`, `#Legal`, `#Finance`,
`#Operations`, `#Communications`, `#Policy`, `#Data Analysis`, `#Research`,
`#Other`, plus "More tags") and a tool filter.

#### Scenario: Tag selection
- **WHEN** a Viewer clicks the `#HR` chip
- **THEN** only prompts whose `tags` array contains `#HR` SHALL be shown
- **AND** the chip SHALL render in its selected state

#### Scenario: Combined filters
- **WHEN** the `#HR` chip and the Copilot tool filter are both active
- **THEN** the result set SHALL be the intersection of both filters

### Requirement: Sort modes
The page SHALL provide sort tabs `✨ Recommended`, `🔥 Most upvotes`, `🆕
Just added`, and `💬 Most comments`. The default sort SHALL be Recommended.

#### Scenario: Switching sort
- **WHEN** a Viewer clicks "🔥 Most upvotes"
- **THEN** prompts SHALL re-order by upvote count descending
- **AND** ties SHALL break by creation date descending

### Requirement: Prompt creation
The system SHALL expose `POST /api/prompts` allowing any authenticated user
to create a prompt with title, summary, body, tool, tags, and an inferred
author derived from `x-user-email`.

#### Scenario: Successful creation
- **WHEN** a Viewer submits a valid prompt via the "Share your own prompt"
  form
- **THEN** the API SHALL persist a new prompt document with `author`
  resolved to the user's Person reference and `createdAt: now()`
- **AND** the prompt SHALL appear at the top of the "Just added" sort

#### Scenario: Validation error
- **WHEN** a submission is missing `title` or `body`
- **THEN** the API SHALL respond with HTTP 400
- **AND** the form SHALL show inline errors on the missing fields

### Requirement: Idempotent upvotes
The system SHALL expose `POST /api/prompts/[id]/upvote` that toggles the
upvote for the calling user. A duplicate request from the same user SHALL be
a no-op rather than a double-count.

#### Scenario: First upvote
- **WHEN** a Viewer who has not previously upvoted a prompt POSTs to its
  upvote endpoint
- **THEN** the prompt's `upvotes` array SHALL gain an entry
  `{ userEmail }` for that user
- **AND** the response body SHALL include the new upvote count

#### Scenario: Toggle off
- **WHEN** the same user POSTs to the upvote endpoint a second time
- **THEN** their entry SHALL be removed from `upvotes`
- **AND** the response SHALL reflect the decremented count

### Requirement: Comments
The system SHALL expose `POST /api/prompts/[id]/comments` appending a
comment `{ userEmail, body, createdAt }` to a prompt.

#### Scenario: Adding a comment
- **WHEN** a Viewer submits a non-empty comment on a prompt
- **THEN** the comment SHALL be appended to the prompt's `comments` array
- **AND** the prompt card's comment count SHALL increment by one

#### Scenario: Empty comment rejected
- **WHEN** a Viewer submits an empty comment body
- **THEN** the API SHALL respond with HTTP 400
- **AND** SHALL NOT append anything

### Requirement: Monthly competition tabulation
The system SHALL run a monthly job that picks the top-voted prompt from the
prior month and sets `competitionMonth` on the winner to that month in
`YYYY-MM` form. Only one winner per month.

#### Scenario: Winner selected
- **WHEN** the tabulator runs on the first day of the month
- **THEN** the prompt with the highest upvote count from the previous
  month's submissions SHALL have its `competitionMonth` field set
- **AND** the banner on `/prompts` SHALL update to display the new winner

#### Scenario: Tie-break
- **WHEN** two or more prompts tie for the top upvote count
- **THEN** the prompt with the earliest `createdAt` SHALL win
